import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { Redis } from 'ioredis';
import { MailService } from '../utils/mail.service';

@Injectable()
export class AdminService {
    private redisClient: Redis;

    constructor(
        private prisma: PrismaService,
        private chatGateway: ChatGateway,
        private mailService: MailService,
    ) {
        this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            connectTimeout: 15000,
            maxRetriesPerRequest: null,
            retryStrategy: (times) => Math.min(times * 100, 3000),
        });
        this.redisClient.on('error', (err) => console.error('[AdminService] Redis error:', err));
    }

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
            totalUsers,                  // 0
            newUsersToday,              // 1
            newUsersThisWeek,           // 2
            verifiedUsers,              // 3
            unverifiedUsers,            // 4
            bannedUsers,                // 5
            active24h,                  // 6
            active7d,                   // 7
            active30d,                  // 8
            totalConversations,         // 9
            groupConversations,         // 10
            dmConversations,            // 11
            totalMessages,              // 12
            messagesToday,              // 13
            deletedMessages,            // 14
            imageMessages,              // 15
            audioMessages,              // 16
            videoMessages,              // 17
            fileMessages,               // 18
            notificationsToday,         // 19
            notificationsWeek,          // 20
            broadcastsTotal,            // 21
            bansToday,                  // 22
            failedNotificationsToday,   // 23
            pendingInboxConversations,  // 24
            avgResponseTimeMinutes,     // 25
            pageInboxSize,              // 26
            activeCallsCount,           // 27
        ] = await Promise.all([
            this.prisma.user.count(),                                                      // 0
            this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),       // 1
            this.prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),        // 2
            this.prisma.user.count({ where: { isVerified: true } }),                       // 3
            this.prisma.user.count({ where: { isVerified: false } }),                      // 4
            this.prisma.user.count({ where: { isBanned: true } }),                         // 5
            this.prisma.user.count({ where: { lastSeen: { gte: startOf24h } } }),          // 6
            this.prisma.user.count({ where: { lastSeen: { gte: startOf7d } } }),           // 7
            this.prisma.user.count({ where: { lastSeen: { gte: startOf30d } } }),          // 8
            this.prisma.conversation.count(),                                              // 9
            this.prisma.conversation.count({ where: { isGroup: true } }),                  // 10
            this.prisma.conversation.count({ where: { isGroup: false } }),                 // 11
            this.prisma.message.count({ where: { isDeleted: false } }),                    // 12
            // Message uses "timestamp" field, not "createdAt"
            this.prisma.message.count({ where: { timestamp: { gte: startOfToday }, isDeleted: false } }), // 13
            this.prisma.message.count({ where: { isDeleted: true } }),                     // 14
            this.prisma.message.count({ where: { type: 'IMAGE', isDeleted: false } }),     // 15
            this.prisma.message.count({ where: { type: 'AUDIO', isDeleted: false } }),     // 16
            this.prisma.message.count({ where: { type: 'VIDEO', isDeleted: false } }),     // 17
            this.prisma.message.count({ where: { type: 'FILE', isDeleted: false } }),      // 18
            this.prisma.notification.count({ where: { createdAt: { gte: startOfToday } } }), // 19
            this.prisma.notification.count({ where: { createdAt: { gte: startOfWeek } } }),  // 20
            this.prisma.notification.count({ where: { type: 'BROADCAST' } }),              // 21
            this.prisma.auditLog.count({                                                   // 22
                where: {
                    action: 'USER_BANNED',
                    createdAt: { gte: startOfToday },
                },
            }),
            this.prisma.notification.count({                                               // 23
                where: {
                    createdAt: { gte: startOfToday },
                    deliveryStatus: 'FAILED',
                },
            }),
            this.prisma.conversation.count({                                               // 24
                where: { messages: { none: {} } },
            }),
            this.prisma.$queryRaw<{ avg_minutes: number | null }[]>`SELECT AVG(EXTRACT(EPOCH FROM (m2."timestamp" - m1."timestamp")) / 60.0) AS avg_minutes
              FROM "Message" m1
              JOIN "Message" m2 ON m2."conversationId" = m1."conversationId"
              WHERE m1."timestamp" >= NOW() - INTERVAL '48 hours'
                AND m2.id = (
                  SELECT MIN(m3.id)
                  FROM "Message" m3
                  WHERE m3."conversationId" = m1."conversationId" AND m3.id > m1.id
                )
                AND EXTRACT(EPOCH FROM (m2."timestamp" - m1."timestamp")) / 60.0 <= 180.0`,
            this.prisma.conversation.count({ where: { pageId: { not: null } } }),          // 26
            this.prisma.call.count({ where: { endedAt: null } }),                          // 27
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

        // Recent user reports (moderation queue)
        const recentReports = await this.prisma.auditLog.findMany({
            where: { action: 'USER_REPORTED' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });

        const reportsWithTargets = await Promise.all(
            recentReports.map(async (rep) => {
                let targetUser = null;
                if (rep.targetId) {
                    targetUser = await this.prisma.user.findUnique({
                        where: { id: rep.targetId },
                        select: { id: true, username: true, email: true, profileImage: true }
                    });
                }
                return {
                    id: rep.id,
                    reporter: rep.user ? { id: rep.user.id, username: rep.user.username, email: rep.user.email } : null,
                    target: targetUser,
                    reason: rep.details,
                    createdAt: rep.createdAt
                };
            })
        );

        // Trending posts (page posts with views and reaction count)
        const trendingPosts = await this.prisma.pagePost.findMany({
            take: 5,
            orderBy: { views: 'desc' },
            include: {
                page: {
                    select: {
                        id: true,
                        name: true,
                        handle: true,
                        avatarUrl: true
                    }
                },
                reactions: true
            }
        });

        const formattedPosts = trendingPosts.map(p => ({
            id: p.id,
            content: p.content,
            views: p.views,
            createdAt: p.createdAt,
            page: p.page,
            reactionsCount: p.reactions.length
        }));

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
            activeCallsCount,
            recentReports: reportsWithTargets,
            trendingPosts: formattedPosts,
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
                category: 'admin',
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
                category: 'admin',
                details: `User ban lifted.`
            }
        });

        // Send a beautifully styled unban email to the restored user
        try {
            await this.mailService.sendUnbanNotificationEmail(unbannedUser.email, unbannedUser.username);
        } catch (mailError) {
            console.error('Failed to send unban notification email', mailError);
        }

        return unbannedUser;
    }

    async getAuditLogs(page = 1, limit = 30, action?: string, category?: string, search?: string) {
        const skip = (page - 1) * limit;
        const where: any = {};
        
        if (action) {
            where.action = action;
        }
        if (category && category !== 'all') {
            where.category = category;
        }
        if (search) {
            where.OR = [
                { action: { contains: search, mode: 'insensitive' as const } },
                { details: { contains: search, mode: 'insensitive' as const } },
                { ipAddress: { contains: search, mode: 'insensitive' as const } },
                { user: { username: { contains: search, mode: 'insensitive' as const } } },
                { user: { email: { contains: search, mode: 'insensitive' as const } } },
            ];
        }

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

    async getSettings() {
        const settings = await this.prisma.setting.findMany();
        
        // Define default settings
        const defaults: Record<string, string> = {
            platform_name: 'Himate',
            support_email: 'support@himate.com',
            maintenance_message: "We'll be right back.",
            maintenance_mode: 'false',
            require_verification: 'true',
            public_registration: 'true',
            rate_limiting: 'false',
        };

        // Merge DB settings over defaults
        const result = { ...defaults };
        for (const s of settings) {
            result[s.key] = s.value;
        }

        return result;
    }

    async updateSetting(adminId: number, key: string, value: string) {
        const existing = await this.prisma.setting.findFirst({
            where: { key }
        });

        let setting;
        if (existing) {
            setting = await this.prisma.setting.update({
                where: { id: existing.id },
                data: { value, userId: adminId }
            });
        } else {
            setting = await this.prisma.setting.create({
                data: {
                    key,
                    value,
                    userId: adminId
                }
            });
        }

        // Sync to Redis immediately for fast system-wide middleware lookups!
        await this.redisClient.set(`system_config:${key}`, value);

        return setting;
    }

    async deleteMessage(messageId: number) {
        const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
        if (!msg) {
            throw new NotFoundException('Message not found');
        }
        await this.prisma.message.update({
            where: { id: messageId },
            data: { isDeleted: true },
        });

        // Audit Log
        await this.prisma.auditLog.create({
            data: {
                action: 'MESSAGE_DELETED_SYSTEM_WIDE',
                targetId: messageId,
                details: `Message ID ${messageId} deleted system-wide by admin`,
            },
        });

        return { success: true };
    }

    async freezeConversation(conversationId: number) {
        const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conv) {
            throw new NotFoundException('Conversation not found');
        }

        // Audit Log
        await this.prisma.auditLog.create({
            data: {
                action: 'CONVERSATION_FROZEN',
                targetId: conversationId,
                details: `Conversation ID ${conversationId} frozen by admin`,
            },
        });

        return { success: true };
    }

    async terminateConversationSessions(conversationId: number) {
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (!conv) {
            throw new NotFoundException('Conversation not found');
        }

        const userIds = conv.participants.map((p) => p.userId);
        
        // Terminate any active calls associated with participants
        const activeCalls = await this.prisma.call.updateMany({
            where: {
                endedAt: null,
                OR: [
                    { callerId: { in: userIds } },
                    { receiverId: { in: userIds } },
                ],
            },
            data: { endedAt: new Date() },
        });

        // Audit Log
        await this.prisma.auditLog.create({
            data: {
                action: 'CONVERSATION_SESSIONS_TERMINATED',
                targetId: conversationId,
                details: `Terminated ${activeCalls.count} active WebRTC calls for conversation ID ${conversationId}`,
            },
        });

        return { success: true, count: activeCalls.count };
    }
}
