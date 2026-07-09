import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UseFilters, UsePipes, ValidationPipe, Inject, forwardRef } from '@nestjs/common';

import { FcmService } from '../notifications/fcm.service';
import { Redis } from 'ioredis';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private redisClient: Redis;

    constructor(
        private jwtService: JwtService,
        private prisma: PrismaService,
        @Inject(forwardRef(() => FcmService))
        private fcmService: FcmService,
    ) {
        this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            connectTimeout: 5000,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 100, 3000),
        });
        this.redisClient.on('error', (err) => console.error('[ChatGateway] Redis error:', err.message));
    }

    afterInit(server: Server) {
        console.log('Chat Gateway Initialized');
    }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token?.split(' ')[1];
            if (!token) {
                console.log('No token provided, disconnecting client');
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);

            // ─── CHECK MAINTENANCE MODE FOR SOCKET CONNECTION ─────────────
            let maintenanceMode: string | null = null;
            try {
                maintenanceMode = await this.redisClient.get('system_config:maintenance_mode');
            } catch (err: any) {
                console.warn('[ChatGateway] Redis get maintenanceMode failed:', err.message);
            }

            if (!maintenanceMode) {
                const dbSetting = await this.prisma.setting.findFirst({ where: { key: 'maintenance_mode' } });
                maintenanceMode = dbSetting ? dbSetting.value : 'false';
                try {
                    await this.redisClient.set('system_config:maintenance_mode', maintenanceMode, 'EX', 3600);
                } catch (err: any) {
                    console.warn('[ChatGateway] Redis set maintenanceMode failed:', err.message);
                }
            }

            if (maintenanceMode === 'true') {
                const user = await this.prisma.user.findUnique({
                    where: { id: payload.sub },
                    include: { role: true },
                });
                const isAdmin = user?.role?.name === 'ADMIN';

                if (!isAdmin) {
                    let maintenanceMessage: string | null = null;
                    try {
                        maintenanceMessage = await this.redisClient.get('system_config:maintenance_message');
                    } catch (err: any) {
                        console.warn('[ChatGateway] Redis get maintenanceMessage failed:', err.message);
                    }

                    if (!maintenanceMessage) {
                        const dbMsg = await this.prisma.setting.findFirst({ where: { key: 'maintenance_message' } });
                        maintenanceMessage = dbMsg ? dbMsg.value : "We'll be right back.";
                        try {
                            await this.redisClient.set('system_config:maintenance_message', maintenanceMessage, 'EX', 3600);
                        } catch (err: any) {
                            console.warn('[ChatGateway] Redis set maintenanceMessage failed:', err.message);
                        }
                    }
                    console.log(`[ChatGateway] Disconnecting non-admin ${payload.sub} due to Maintenance Mode`);
                    client.emit('maintenance', { message: maintenanceMessage });
                    client.disconnect();
                    return;
                }
            }

            client.data.userId = payload.sub;

            console.log(`User connected: ${payload.sub}`);

            // Join special room for user notifications/direct emits
            client.join(`user_${payload.sub}`);

            // Update user status to online in database
            await this.prisma.user.update({
                where: { id: payload.sub },
                data: { lastSeen: new Date() },
            });

            // Broadcast online status to others
            this.server.emit('presence', { userId: payload.sub, status: 'online' });
        } catch (e) {
            console.error('Connection error:', e.message);
            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        if (client.data.userId) {
            const userId = client.data.userId;
            console.log(`User disconnected: ${userId}`);

            // Update lastSeen in database
            await this.prisma.user.update({
                where: { id: userId },
                data: { lastSeen: new Date() },
            });

            this.server.emit('presence', { userId, status: 'offline' });
        }
    }

    @SubscribeMessage('joinConversation')
    async handleJoinRoom(@MessageBody() conversationId: number, @ConnectedSocket() client: Socket) {
        // Verify user is a participant
        const isParticipant = await this.prisma.conversationParticipant.findFirst({
            where: { conversationId, userId: client.data.userId },
        });

        if (!isParticipant) {
            console.log(`Unauthorized room join attempt: user ${client.data.userId} -> room ${conversationId}`);
            return { error: 'Unauthorized' };
        }

        client.join(`conversation_${conversationId}`);
        console.log(`User ${client.data.userId} joined room ${conversationId}`);
        return { success: true };
    }

    @SubscribeMessage('leaveConversation')
    handleLeaveRoom(@MessageBody() conversationId: number, @ConnectedSocket() client: Socket) {
        client.leave(`conversation_${conversationId}`);
        console.log(`User ${client.data.userId} left room ${conversationId}`);
        return { success: true };
    }

    /**
     * Sends a message to a specific conversation room and notifies participants.
     * Supports text content and multiple media attachments.
     */
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() data: {
            conversationId: number;
            content: string;
            mediaUrl?: string;
            attachments?: { url: string; type: string }[]
        },
        @ConnectedSocket() client: Socket,
    ) {
        const senderId = client.data.userId;

        // Persist message with optional single mediaUrl and multiple attachments
        const message = await this.prisma.message.create({
            data: {
                content: data.content,
                senderId,
                conversationId: data.conversationId,
                mediaUrl: data.mediaUrl,
                attachments: data.attachments ? {
                    create: data.attachments.map(att => ({
                        url: att.url,
                        type: att.type,
                    })),
                } : undefined,
            },
            include: {
                sender: true,
                attachments: true,
            }
        });

        // Broadcast the full message object to everyone in the conversation room
        this.server.to(`conversation_${data.conversationId}`).emit('newMessage', message);

        // Notify participants who might not be in the active room (Push Simulation)
        const participants = await this.prisma.conversationParticipant.findMany({
            where: { conversationId: data.conversationId },
            include: { user: true },
        });

        participants.forEach(p => {
            if (p.userId !== senderId) {
                const userRoom = `user_${p.userId}`;
                const isOnline = this.server.sockets.adapter.rooms.get(userRoom)?.size > 0;

                // Emitting the socket notification first for low-latency
                this.server.to(userRoom).emit('notification', {
                    type: 'MESSAGE',
                    content: data.content,
                    senderId,
                    conversationId: data.conversationId,
                });

                // If user is offline and has an FCM token, send a native mobile push notification
                if (!isOnline && p.user.fcmToken) {
                    this.fcmService.sendPushNotification(
                        p.user.fcmToken,
                        message.sender.username || 'New Message',
                        data.content,
                        {
                            conversationId: data.conversationId.toString(),
                            senderId: senderId.toString(),
                            type: 'MESSAGE',
                        },
                    );
                }
            }
        });

        return message;
    }

    /**
     * Broadcasts typing events to other participants in the conversation.
     */
    @SubscribeMessage('typing')
    handleTyping(
        @MessageBody() data: { conversationId: number; isTyping: boolean },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(`conversation_${data.conversationId}`).emit('userTyping', {
            userId: client.data.userId,
            isTyping: data.isTyping,
        });
    }

    /**
     * Marks a message as delivered once it reaches the client's device.
     */
    @SubscribeMessage('markDelivered')
    async handleMarkDelivered(@MessageBody() messageId: number, @ConnectedSocket() client: Socket) {
        const message = await this.prisma.message.update({
            where: { id: messageId },
            data: { isDelivered: true },
            include: { conversation: { include: { participants: true } } }
        });

        // Notify the sender that the message was delivered
        this.server.to(`user_${message.senderId}`).emit('messageStatusUpdate', {
            messageId,
            status: 'DELIVERED',
            conversationId: message.conversationId,
        });
    }

    /**
     * Marks a message as read when the user opens the conversation.
     */
    @SubscribeMessage('markRead')
    async handleMarkRead(@MessageBody() messageId: number, @ConnectedSocket() client: Socket) {
        const message = await this.prisma.message.update({
            where: { id: messageId },
            data: { isRead: true, isDelivered: true },
        });

        // Notify the sender that the message was read (Blue Tick)
        this.server.to(`user_${message.senderId}`).emit('messageStatusUpdate', {
            messageId,
            status: 'READ',
            conversationId: message.conversationId,
        });
    }

    @SubscribeMessage('initiateCall')
    handleInitiateCall(
        @MessageBody() data: { receiverId: number; type: 'AUDIO' | 'VIDEO'; conversationId: number },
        @ConnectedSocket() client: Socket,
    ) {
        const senderId = client.data.userId;
        this.server.to(`user_${data.receiverId}`).emit('incomingCall', {
            callerId: senderId,
            type: data.type,
            conversationId: data.conversationId,
        });
    }

    /**
     * Broadcasts when a user accepts an incoming call.
     */
    @SubscribeMessage('acceptCall')
    handleAcceptCall(
        @MessageBody() data: { callerId: number },
        @ConnectedSocket() client: Socket,
    ) {
        this.server.to(`user_${data.callerId}`).emit('callAccepted', {
            receiverId: client.data.userId,
        });
    }

    /**
     * Broadcasts when a user ends or rejects a call.
     */
    @SubscribeMessage('endCall')
    handleEndCall(
        @MessageBody() data: { targetId: number },
        @ConnectedSocket() client: Socket,
    ) {
        this.server.to(`user_${data.targetId}`).emit('callEnded', {
            userId: client.data.userId,
        });
    }

    /**
     * Broadcasts a system-wide update to ALL connected users.
     * Useful for superadmin announcements.
     */
    @SubscribeMessage('systemUpdate')
    handleSystemUpdate(@MessageBody() data: { title: string; content: string }) {
        // Broadacst to everyone connected
        this.server.emit('systemAnnouncement', {
            ...data,
            timestamp: new Date(),
        });
        console.log('System-wide update broadcasted');
    }

    /**
     * Helper method to send a live notification to a specific user.
     * Can be called from other services (e.g., NotificationsService, AuthService).
     */
    sendDirectNotification(userId: number, notification: any) {
        this.server.to(`user_${userId}`).emit('notification', notification);
    }
}
