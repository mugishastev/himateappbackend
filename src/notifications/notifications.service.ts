import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async create(createNotificationDto: CreateNotificationDto) {
        return this.prisma.notification.create({
            data: createNotificationDto,
        });
    }

    async findByUser(userId: number, paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: { userId },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.notification.count({ where: { userId } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async update(id: number, updateNotificationDto: UpdateNotificationDto) {
        return this.prisma.notification.update({
            where: { id },
            data: updateNotificationDto,
        });
    }

    async markAllAsRead(userId: number) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }

    async remove(id: number) {
        return this.prisma.notification.delete({
            where: { id },
        });
    }
}
