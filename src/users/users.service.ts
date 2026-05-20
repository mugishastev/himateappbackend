import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';
import { CloudinaryService } from '../utils/cloudinary.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) { }

    async create(createUserDto: CreateUserDto) {
        return this.prisma.user.create({
            data: createUserDto,
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const { search } = paginationDto;

        const searchCondition = search ? {
            OR: [
                { username: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
            ],
        } : {};

        const where = {
            ...searchCondition,
            // Exclude admins from public searches
            role: {
                name: { not: 'ADMIN' }
            }
        };

        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take,
                include: { role: true },
                orderBy: { username: 'asc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: data.map(user => this.sanitizeUser(user)),
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!user) throw new NotFoundException(`User with ID ${id} not found`);

        return this.sanitizeUser(user);
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const data = { ...updateUserDto };

        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }

        return this.prisma.user.update({
            where: { id },
            // Filter out fields that might exist in DTO but not in DB
            data: data,
        });
    }

    async updateProfileImage(id: number, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Image file is required');
        }

        await this.findOne(id);
        const result = await this.cloudinary.uploadImage(file);

        return this.prisma.user.update({
            where: { id },
            data: { profileImage: result.secure_url },
        });
    }

    async updateFcmToken(id: number, fcmToken: string) {
        return this.prisma.user.update({
            where: { id },
            data: { fcmToken },
        });
    }

    async remove(id: number) {
        return this.prisma.user.delete({
            where: { id },
        });
    }

    async changePassword(id: number, currentPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) throw new BadRequestException('Current password is incorrect');

        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({ where: { id }, data: { password: hashed } });
        return { message: 'Password updated successfully' };
    }

    async blockUser(blockerId: number, blockedId: number) {
        if (blockerId === blockedId) {
            throw new BadRequestException('You cannot block yourself');
        }
        // Upsert to avoid duplicates
        await this.prisma.blockedUser.upsert({
            where: { blockerId_blockedId: { blockerId, blockedId } },
            create: { blockerId, blockedId },
            update: {},
        });
        return { message: 'User blocked successfully' };
    }

    async unblockUser(blockerId: number, blockedId: number) {
        await this.prisma.blockedUser.deleteMany({
            where: { blockerId, blockedId },
        });
        return { message: 'User unblocked successfully' };
    }

    async getBlockedUsers(userId: number) {
        const blocked = await this.prisma.blockedUser.findMany({
            where: { blockerId: userId },
            include: {
                blocked: {
                    select: { id: true, username: true, profileImage: true },
                },
            },
        });
        return blocked.map(b => b.blocked);
    }

    async generate2FASecret(id: number) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        // Using require to bypass build-time module resolution errors
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { authenticator } = require('otplib');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const qrcode = require('qrcode');

        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(user.username || user.email, 'Himate', secret);

        await this.prisma.user.update({
            where: { id },
            data: { twoStepSecret: secret },
        });

        const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
        return { qrCode: qrCodeDataUrl };
    }

    async verify2FAToken(id: number, token: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        if (!user.twoStepSecret) throw new BadRequestException('2FA is not set up');

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { authenticator } = require('otplib');
        const isValid = authenticator.verify({ token, secret: user.twoStepSecret });

        if (!isValid) throw new BadRequestException('Invalid 2FA token');

        await this.prisma.user.update({
            where: { id },
            data: { twoStepEnabled: true },
        });

        return { message: '2FA enabled successfully' };
    }

    async getSessions(id: number) {
        const audits = await this.prisma.auditLog.findMany({
            where: { userId: id, action: 'LOGIN' },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        return audits.map((a) => ({
            id: a.id.toString(),
            ipAddress: a.ipAddress || '127.0.0.1',
            userAgent: a.details || 'Unknown Device',
            lastActive: a.createdAt,
        }));
    }

    async revokeSession(id: number, sessionId: string) {
        const sid = parseInt(sessionId, 10);
        if (isNaN(sid)) {
            throw new BadRequestException('Invalid session ID');
        }

        await this.prisma.auditLog.deleteMany({
            where: { id: sid, userId: id }
        });
        return { message: 'Session revoked' };
    }

    async exportData(id: number) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        const messages = await this.prisma.message.findMany({
            where: { senderId: id }
        });

        return {
            user: this.sanitizeUser(user),
            messages,
            exportedAt: new Date(),
        };
    }

    async deactivateAccount(id: number) {
        return this.prisma.user.update({
            where: { id },
            data: { deactivatedAt: new Date() }
        });
    }

    private sanitizeUser(user: any) {
        if (!user) return null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, twoStepSecret, ...sanitized } = user;

        // Explicitly check for privacy settings
        if (sanitized.showLastSeen === false) sanitized.lastSeen = null;
        if (sanitized.showProfilePhoto === false) sanitized.profileImage = null;

        // Ensure IDs are numbers
        if (sanitized.id) sanitized.id = Number(sanitized.id);

        return sanitized;
    }
}
