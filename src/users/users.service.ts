import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';
import { CloudinaryService } from '../utils/cloudinary.service';

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
            data,
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
        return user;
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id },
            data: updateUserDto,
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
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const bcrypt = require('bcryptjs');
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
}
