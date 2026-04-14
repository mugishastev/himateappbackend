import { Injectable, NotFoundException, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

import { ChatGateway } from '../chat/chat.gateway';
import { FcmService } from './fcm.service';

@Injectable()
export class NotificationsService {
    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => ChatGateway))
        private chatGateway: ChatGateway,
        private fcmService: FcmService,
    ) { }

    async create(createNotificationDto: CreateNotificationDto) {
        const notification = await this.prisma.notification.create({
            data: createNotificationDto,
        });

        // Push real-time notification to the user
        this.chatGateway.sendDirectNotification(notification.userId, notification);

        const user = await this.prisma.user.findUnique({ where: { id: notification.userId } });
        let deliveryStatus: 'SENT' | 'FAILED' = 'SENT';
        let deliveryError: string | null = null;

        if (user?.fcmToken) {
            const ok = await this.fcmService.sendPushNotification(
                user.fcmToken,
                notification.type,
                notification.content,
                { notificationId: String(notification.id), type: notification.type },
            );
            if (!ok) {
                deliveryStatus = 'FAILED';
                deliveryError = 'FCM send failed';
            }
        }

        const updated = await this.prisma.notification.update({
            where: { id: notification.id },
            data: {
                deliveryStatus,
                deliveredAt: new Date(),
                deliveryError,
            },
        });

        return updated;
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

    async update(id: number, updateNotificationDto: UpdateNotificationDto, currentUserId: number, isAdmin = false) {
        const notification = await this.prisma.notification.findUnique({ where: { id } });
        if (!notification) throw new NotFoundException('Notification not found');
        if (!isAdmin && notification.userId !== currentUserId) {
            throw new ForbiddenException('You can only update your own notifications');
        }
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

    async remove(id: number, currentUserId: number, isAdmin = false) {
        const notification = await this.prisma.notification.findUnique({ where: { id } });
        if (!notification) throw new NotFoundException('Notification not found');
        if (!isAdmin && notification.userId !== currentUserId) {
            throw new ForbiddenException('You can only delete your own notifications');
        }
        return this.prisma.notification.delete({
            where: { id },
        });
    }
}
