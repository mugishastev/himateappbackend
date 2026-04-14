import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/message.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';
import { CloudinaryService } from '../utils/cloudinary.service';

@Injectable()
export class MessagesService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(createMessageDto: CreateMessageDto, file?: Express.Multer.File) {
        let mediaUrl: string | null = null;
        let type = createMessageDto.type || 'TEXT';

        if (file) {
            const result = await this.cloudinary.uploadImage(file);
            mediaUrl = result.secure_url;

            // Simple type detection based on mimetype
            if (file.mimetype.startsWith('image/')) {
                type = 'IMAGE';
            } else if (file.mimetype.startsWith('video/')) {
                type = 'VIDEO';
            } else if (file.mimetype.startsWith('audio/')) {
                type = 'AUDIO';
            } else {
                type = 'FILE';
            }
        }

        return this.prisma.message.create({
            data: {
                ...createMessageDto,
                content: createMessageDto.content || '',
                mediaUrl,
                type: type as any,
            },
            include: { sender: true },
        });
    }

    // ─── Find All in Conversation ─────────────────────────────────────────────

    async findByConversation(conversationId: number, userId: number, userRole: string, paginationDto: PaginationDto) {
        const roleName = typeof userRole === 'string' ? userRole : (userRole as any)?.name;
        // If not ADMIN, verify participation in the conversation
        if (roleName !== 'ADMIN') {
            const isParticipant = await this.prisma.conversationParticipant.findFirst({
                where: { conversationId, userId },
            });
            if (!isParticipant) throw new UnauthorizedException('You are not a participant in this conversation');
        }

        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { conversationId, isDeleted: false },
                skip,
                take,
                orderBy: { timestamp: 'desc' },
                include: { sender: true, attachments: true },
            }),
            this.prisma.message.count({ where: { conversationId, isDeleted: false } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    // ─── Find One ─────────────────────────────────────────────────────────────

    async findOne(id: number, userId: number, userRole: string) {
        const roleName = typeof userRole === 'string' ? userRole : (userRole as any)?.name;
        const message = await this.prisma.message.findUnique({
            where: { id },
            include: {
                sender: true,
                attachments: true,
                conversation: { include: { participants: true } },
            },
        });
        if (!message) throw new NotFoundException(`Message with ID ${id} not found`);
        if (roleName !== 'ADMIN') {
            const isParticipant = message.conversation.participants.some((participant) => participant.userId === userId);
            if (!isParticipant) {
                throw new UnauthorizedException('You are not a participant in this conversation');
            }
        }
        return message;
    }

    // ─── Mark as Read ─────────────────────────────────────────────────────────

    async markAsRead(id: number, userId: number, userRole: string) {
        const roleName = typeof userRole === 'string' ? userRole : (userRole as any)?.name;
        const message = await this.prisma.message.findUnique({
            where: { id },
            include: { conversation: { include: { participants: true } } },
        });
        if (!message) throw new NotFoundException(`Message with ID ${id} not found`);
        if (roleName !== 'ADMIN') {
            const isParticipant = message.conversation.participants.some((participant) => participant.userId === userId);
            if (!isParticipant) {
                throw new UnauthorizedException('You are not a participant in this conversation');
            }
        }

        return this.prisma.message.update({
            where: { id },
            data: { isRead: true, isDelivered: true },
        });
    }

    // ─── Update ───────────────────────────────────────────────────────────────
    async update(id: number, content: string, userId: number) {
        const message = await this.prisma.message.findUnique({ where: { id } });
        if (!message) throw new NotFoundException(`Message with ID ${id} not found`);

        if (message.senderId !== userId) {
            throw new UnauthorizedException('You can only edit your own messages');
        }

        return this.prisma.message.update({
            where: { id },
            data: { content },
        });
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    async remove(id: number, userId: number, userRole: string) {
        const roleName = typeof userRole === 'string' ? userRole : (userRole as any)?.name;
        const message = await this.prisma.message.findUnique({ where: { id } });
        if (!message) throw new NotFoundException(`Message with ID ${id} not found`);

        // Only sender or ADMIN/MODERATOR can delete
        if (message.senderId !== userId && roleName !== 'ADMIN' && roleName !== 'MODERATOR') {
            throw new UnauthorizedException('You can only delete your own messages');
        }

        return this.prisma.message.update({
            where: { id },
            data: { isDeleted: true },
        });
    }

    // ─── Unread Count ─────────────────────────────────────────────────────────

    async countUnread(userId: number, conversationId: number) {
        return this.prisma.message.count({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
                isDeleted: false,
            },
        });
    }

    // ─── Mark Conversation As Read ────────────────────────────────────────────

    async markConversationAsRead(conversationId: number, userId: number) {
        const result = await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
                isDeleted: false,
            },
            data: { isRead: true },
        });

        return { count: result.count };
    }
}
