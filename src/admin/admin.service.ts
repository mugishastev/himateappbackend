import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { Redis } from 'ioredis';

@Injectable()
export class AdminService {
    constructor(
        private prisma: PrismaService,
        private chatGateway: ChatGateway,
    ) { }

    async getHealth() {
        const result: any = {
            database: { ok: false },
            redis: { ok: false },
            firebase: {
                configured: !!(
                    process.env.FIREBASE_PROJECT_ID &&
                    process.env.FIREBASE_CLIENT_EMAIL &&
                    process.env.FIREBASE_PRIVATE_KEY
                ),
            },
            timestamp: new Date().toISOString(),
        };

        try {
            await this.prisma.$queryRaw`SELECT 1`;
            result.database.ok = true;
        } catch (err: any) {
            result.database.error = err?.message || 'Database check failed';
        }

        try {
            const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
            const pong = await redis.ping();
            result.redis.ok = pong === 'PONG';
            await redis.quit();
        } catch (err: any) {
            result.redis.error = err?.message || 'Redis check failed';
        }

        return result;
    }

    async getStats() {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        const startOf24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const startOf7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            newUsersToday,
            newUsersThisWeek,
            verifiedUsers,
            unverifiedUsers,
            bannedUsers,
            active24h,
            active7d,
            active30d,
            totalConversations,
            groupConversations,
            dmConversations,
            totalMessages,
            messagesToday,
            deletedMessages,
            imageMessages,
            audioMessages,
            videoMessages,
            fileMessages,
            notificationsToday,
            notificationsWeek,
            broadcastsTotal,
            bansToday,
            pendingInboxConversations,
            avgResponseTimeMinutes,
            pageInboxSize,
            failedNotificationsToday,
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
            this.prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
            this.prisma.user.count({ where: { isVerified: true } }),
            this.prisma.user.count({ where: { isVerified: false } }),
            this.prisma.user.count({ where: { isBanned: true } }),
            this.prisma.user.count({ where: { lastSeen: { gte: startOf24h } } }),
            this.prisma.user.count({ where: { lastSeen: { gte: startOf7d } } }),
            this.prisma.user.count({ where: { lastSeen: { gte: startOf30d } } }),
            this.prisma.conversation.count(),
            this.prisma.conversation.count({ where: { isGroup: true } }),
            this.prisma.conversation.count({ where: { isGroup: false } }),
            this.prisma.message.count({ where: { isDeleted: false } }),
            // Message uses "timestamp" field, not "createdAt"
            this.prisma.message.count({ where: { timestamp: { gte: startOfToday }, isDeleted: false } }),
            this.prisma.message.count({ where: { isDeleted: true } }),
            this.prisma.message.count({ where: { type: 'IMAGE', isDeleted: false } }),
            this.prisma.message.count({ where: { type: 'AUDIO', isDeleted: false } }),
            this.prisma.message.count({ where: { type: 'VIDEO', isDeleted: false } }),
            this.prisma.message.count({ where: { type: 'FILE', isDeleted: false } }),
            this.prisma.notification.count({ where: { createdAt: { gte: startOfToday } } }),
            this.prisma.notification.count({ where: { createdAt: { gte: startOfWeek } } }),
            this.prisma.notification.count({ where: { type: 'BROADCAST' } }),
            this.prisma.auditLog.count({
                where: {
                    action: 'USER_BANNED',
                    createdAt: { gte: startOfToday },
                },
            }),
            this.prisma.notification.count({
                where: {
                    createdAt: { gte: startOfToday },
                    deliveryStatus: 'FAILED',
                },
            }),
            // Conversations with no messages (inbox waiting)
            this.prisma.conversation.count({
                where: { messages: { none: {} } },
            }),
            // Rough average response time: avg time between first two messages in a conversation
            this.prisma.$queryRaw<
                { avg_minutes: number | null }[]
            >`SELECT AVG(EXTRACT(EPOCH FROM (m2."timestamp" - m1."timestamp")) / 60.0) AS avg_minutes
              FROM "Message" m1
              JOIN "Message" m2 ON m2."conversationId" = m1."conversationId"
              WHERE m2.id = (
                SELECT MIN(m3.id)
                FROM "Message" m3
                WHERE m3."conversationId" = m1."conversationId" AND m3.id > m1.id
              )`,
            // Page inbox size: number of conversations linked to pages
            this.prisma.conversation.count({ where: { pageId: { not: null } } }),
        ]);

        // Last 7 days activity (messages per day) — using "timestamp" field
        const weeklyActivity = await Promise.all(
            Array.from({ length: 7 }, (_, i) => {
                const day = new Date();
                day.setDate(day.getDate() - (6 - i));
                const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                return this.prisma.message.count({
                    where: { timestamp: { gte: start, lt: end }, isDeleted: false },
                }).then((count) => ({
                    date: start.toLocaleDateString('en-US', { weekday: 'short' }),
                    messages: count,
                }));
            })
        );

        // Recent users — joined via role relation to check admin status
        const recentUsers = await this.prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                username: true,
                email: true,
                profileImage: true,
                createdAt: true,
                role: { select: { name: true } },
            },
        });

        return {
            users: {
                total: totalUsers,
                today: newUsersToday,
                thisWeek: newUsersThisWeek,
                verified: verifiedUsers,
                unverified: unverifiedUsers,
                banned: bannedUsers,
                active: {
                    last24h: active24h,
                    last7d: active7d,
                    last30d: active30d,
                },
            },
            conversations: { total: totalConversations, groups: groupConversations, dms: dmConversations },
            messages: {
                total: totalMessages,
                today: messagesToday,
                deleted: deletedMessages,
                media: { images: imageMessages, audio: audioMessages, video: videoMessages, files: fileMessages },
            },
            notifications: {
                today: notificationsToday,
                thisWeek: notificationsWeek,
                broadcastsTotal,
                failedToday: failedNotificationsToday,
            },
            moderation: {
                bansToday,
                bannedUsers,
            },
            engagement: {
                pendingInboxConversations,
                avgResponseTimeMinutes: avgResponseTimeMinutes?.[0]?.avg_minutes ?? null,
                pageInboxConversations: pageInboxSize,
            },
            weeklyActivity,
            recentUsers: recentUsers.map((u) => ({ ...u, isAdmin: u.role?.name === 'ADMIN' })),
        };
    }

    async getAllUsers(page = 1, limit = 20, search?: string, isBanned?: boolean) {
        const skip = (page - 1) * limit;
        const where: any = {};
        if (search) {
            where.OR = [{ username: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }];
        }
        if (isBanned !== undefined) {
            where.isBanned = isBanned;
        }

        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    profileImage: true,
                    isVerified: true,
                    createdAt: true,
                    lastSeen: true,
                    isBanned: true,
                    banReason: true,
                    role: { select: { name: true } },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: data.map((u) => ({ ...u, isAdmin: u.role?.name === 'ADMIN' })),
            total,
            page,
            limit,
        };
    }

    async getAllConversations(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.conversation.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    participants: { include: { user: { select: { id: true, username: true, profileImage: true } } } },
                    _count: { select: { messages: true } },
                },
            }),
            this.prisma.conversation.count(),
        ]);
        return { data, total, page, limit };
    }

    async searchUsers(query: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        if (!query || !query.trim()) {
            return { data: [], total: 0, page, limit };
        }

        const where = {
            OR: [
                { email: { contains: query, mode: 'insensitive' as const } },
                { username: { contains: query, mode: 'insensitive' as const } },
                { phoneNumber: { contains: query, mode: 'insensitive' as const } },
            ],
        };

        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    phoneNumber: true,
                    profileImage: true,
                    isVerified: true,
                    createdAt: true,
                    lastSeen: true,
                    isBanned: true,
                    banReason: true,
                    role: { select: { name: true } },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: data.map((u) => ({ ...u, isAdmin: u.role?.name === 'ADMIN' })),
            total,
            page,
            limit,
        };
    }

    async searchConversations(query: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        if (!query || !query.trim()) {
            return { data: [], total: 0, page, limit };
        }

        const where = {
            participants: {
                some: {
                    user: {
                        OR: [
                            { email: { contains: query, mode: 'insensitive' as const } },
                            { username: { contains: query, mode: 'insensitive' as const } },
                        ],
                    },
                },
            },
        };

        const [data, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    participants: {
                        include: { user: { select: { id: true, username: true, email: true, profileImage: true } } },
                    },
                    _count: { select: { messages: true } },
                },
            }),
            this.prisma.conversation.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    async getRecentMessages(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { isDeleted: false },
                skip,
                take: limit,
                // Use "timestamp" which is the actual field in the schema
                orderBy: { timestamp: 'desc' },
                include: {
                    sender: { select: { id: true, username: true, profileImage: true } },
                    conversation: { select: { id: true, title: true, isGroup: true } },
                },
            }),
            this.prisma.message.count({ where: { isDeleted: false } }),
        ]);
        return { data, total, page, limit };
    }

    async banUser(id: number, reason: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.roleId) {
            const role = await this.prisma.role.findUnique({ where: { id: user.roleId } });
            if (role?.name === 'ADMIN') {
                throw new BadRequestException('Cannot ban an administrator');
            }
        }

        const bannedUser = await this.prisma.user.update({
            where: { id },
            data: { isBanned: true, banReason: reason },
            select: { id: true, username: true, email: true, isBanned: true, banReason: true }
        });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                userId: id,
                action: 'USER_BANNED',
                details: `User suspended. Reason: ${reason}`
            }
        });

        return bannedUser;
    }

    async unbanUser(id: number) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const unbannedUser = await this.prisma.user.update({
            where: { id },
            data: { isBanned: false, banReason: null },
            select: { id: true, username: true, email: true, isBanned: true }
        });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                userId: id,
                action: 'USER_UNBANNED',
                details: `User ban lifted.`
            }
        });

        return unbannedUser;
    }

    async getAuditLogs(page = 1, limit = 30, action?: string) {
        const skip = (page - 1) * limit;
        const where = action ? { action } : {};

        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, username: true, email: true, profileImage: true } },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    async sendBroadcast(title: string, message: string) {
        // Get all user ids
        const users = await this.prisma.user.findMany({
            where: { isBanned: false },
            select: { id: true },
        });

        // Create a notification for every user
        const notifications = users.map((u) => ({
            userId: u.id,
            type: 'BROADCAST',
            content: `${title}: ${message}`,
            isRead: false,
            deliveryStatus: 'SENT',
            deliveredAt: new Date(),
        }));

        await this.prisma.notification.createMany({
            data: notifications,
        });

        for (const notification of notifications) {
            this.chatGateway.sendDirectNotification(notification.userId, notification);
        }

        this.chatGateway.server?.emit('systemAnnouncement', {
            title,
            content: message,
            timestamp: new Date(),
        });

        // Log in audit
        await this.prisma.auditLog.create({
            data: {
                action: 'BROADCAST_SENT',
                details: `[${title}] ${message}`,
            },
        });

        return { message: 'Broadcast sent successfully', recipients: users.length };
    }

    async getBroadcastHistory() {
        return this.prisma.auditLog.findMany({
            where: { action: 'BROADCAST_SENT' },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
}
