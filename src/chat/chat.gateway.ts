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
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private jwtService: JwtService,
        private prisma: PrismaService,
    ) { }

    afterInit(server: Server) {
        console.log('Chat Gateway Initialized');
    }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);
            client.data.userId = payload.sub;

            console.log(`User connected: ${payload.sub}`);

            // Join special room for user notifications/direct emits
            client.join(`user_${payload.sub}`);

            // Broadcast online status
            this.server.emit('presence', { userId: payload.sub, status: 'online' });
        } catch (e) {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        if (client.data.userId) {
            console.log(`User disconnected: ${client.data.userId}`);
            this.server.emit('presence', { userId: client.data.userId, status: 'offline' });
        }
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(@MessageBody() conversationId: number, @ConnectedSocket() client: Socket) {
        client.join(`conversation_${conversationId}`);
        console.log(`User ${client.data.userId} joined room ${conversationId}`);
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(@MessageBody() conversationId: number, @ConnectedSocket() client: Socket) {
        client.leave(`conversation_${conversationId}`);
        console.log(`User ${client.data.userId} left room ${conversationId}`);
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
        });

        participants.forEach(p => {
            if (p.userId !== senderId) {
                this.server.to(`user_${p.userId}`).emit('notification', {
                    type: 'MESSAGE',
                    content: data.content,
                    senderId,
                    conversationId: data.conversationId,
                });
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
     * Notifies a specific user about an incoming call.
     */
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
