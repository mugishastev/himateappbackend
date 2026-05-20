import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';
import { CloudinaryService } from '../utils/cloudinary.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class StatusesService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) { }

    async create(createStatusDto: CreateStatusDto, file?: Express.Multer.File) {
        let mediaUrl = createStatusDto.mediaUrl;
        if (file) {
            const result = await this.cloudinary.uploadImage(file);
            mediaUrl = result.secure_url;
        }

        // Force exactly 24 hours expiration 
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        return this.prisma.status.create({
            data: {
                content: createStatusDto.content,
                mediaUrl,
                expiresAt,
                user: {
                    connect: { id: createStatusDto.userId! },
                },
            },
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.status.findMany({
                where: { expiresAt: { gt: new Date() } },
                skip,
                take,
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.status.count({ where: { expiresAt: { gt: new Date() } } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findByUser(userId: number, paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.status.findMany({
                where: { userId, expiresAt: { gt: new Date() } },
                skip,
                take,
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.status.count({ where: { userId, expiresAt: { gt: new Date() } } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const status = await this.prisma.status.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!status) throw new NotFoundException(`Status with ID ${id} not found`);
        return status;
    }

    async update(id: number, updateStatusDto: UpdateStatusDto, currentUserId: number, currentUserRole: any) {
        const status = await this.findOne(id);
        const roleName = typeof currentUserRole === 'string' ? currentUserRole : currentUserRole?.name;
        if (status.userId !== currentUserId && roleName !== 'ADMIN') {
            throw new UnauthorizedException('You can only update your own status');
        }

        return this.prisma.status.update({
            where: { id },
            data: updateStatusDto,
        });
    }

    async remove(id: number, currentUserId: number, currentUserRole: any) {
        const status = await this.findOne(id);
        const roleName = typeof currentUserRole === 'string' ? currentUserRole : currentUserRole?.name;
        if (status.userId !== currentUserId && roleName !== 'ADMIN') {
            throw new UnauthorizedException('You can only delete your own status');
        }

        return this.prisma.status.delete({
            where: { id },
        });
    }

    async viewStatus(id: number, userId: number) {
        const status = await this.findOne(id);
        if (status.userId === userId) return; // owner doesn't count as viewer
        
        await this.prisma.statusView.upsert({
            where: { statusId_userId: { statusId: id, userId } },
            create: { statusId: id, userId },
            update: { viewedAt: new Date() }
        });
        return { success: true };
    }

    async getViews(id: number, currentUserId: number) {
        const status = await this.findOne(id);
        if (status.userId !== currentUserId) {
            throw new UnauthorizedException('You can only see views of your own status');
        }
        return this.prisma.statusView.findMany({
            where: { statusId: id },
            include: { user: true },
            orderBy: { viewedAt: 'desc' }
        });
    }

    @Cron(CronExpression.EVERY_HOUR)
    async handleCron() {
        try {
            const result = await this.prisma.status.deleteMany({
                where: { expiresAt: { lt: new Date() } }
            });
            if (result.count > 0) {
                Logger.log(`Deleted ${result.count} expired statuses`, 'StatusesService');
            }
        } catch (error) {
            Logger.error('Failed to clean up expired statuses', error, 'StatusesService');
        }
    }
}
