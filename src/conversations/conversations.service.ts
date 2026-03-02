import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class ConversationsService {
    constructor(private prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(createConversationDto: CreateConversationDto) {
        const { userIds, ...data } = createConversationDto;
        return this.prisma.conversation.create({
            data: {
                ...data,
                participants: {
                    create: userIds.map((userId) => ({ userId })),
                },
            },
            include: {
                participants: { include: { user: true } },
            },
        });
    }

    // ─── Find All ─────────────────────────────────────────────────────────────

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.conversation.findMany({
                skip,
                take,
                include: {
                    participants: { include: { user: true } },
                    messages: { take: 1, orderBy: { timestamp: 'desc' } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.conversation.count(),
        ]);

        return { data, total, page: paginationDto.page, limit: paginationDto.limit };
    }

    // ─── Find by User ─────────────────────────────────────────────────────────

    async findByUser(userId: number, paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);

        const [rawConversations, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where: { participants: { some: { userId } } },
                skip,
                take,
                include: {
                    participants: { include: { user: true } },
                    messages: {
                        where: { isDeleted: false },
                        take: 1,
                        orderBy: { timestamp: 'desc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.conversation.count({
                where: { participants: { some: { userId } } },
            }),
        ]);

        const data = await Promise.all(
            rawConversations.map(async (conv) => {
                const unreadCount = await this.prisma.message.count({
                    where: {
                        conversationId: conv.id,
                        senderId: { not: userId },
                        isRead: false,
                        isDeleted: false,
                    },
                });
                return { ...conv, unreadCount };
            }),
        );

        return { data, total, page: paginationDto.page, limit: paginationDto.limit };
    }

    // ─── Find One ─────────────────────────────────────────────────────────────

    async findOne(id: number) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: { include: { user: true } },
                messages: {
                    where: { isDeleted: false },
                    take: 50,
                    orderBy: { timestamp: 'desc' },
                    include: { sender: true, attachments: true },
                },
            },
        });
        if (!conversation) throw new NotFoundException(`Conversation with ID ${id} not found`);
        return conversation;
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    async update(id: number, updateConversationDto: UpdateConversationDto) {
        return this.prisma.conversation.update({
            where: { id },
            data: updateConversationDto,
        });
    }

    // ─── Add Participant ──────────────────────────────────────────────────────

    async addParticipant(conversationId: number, userId: number) {
        const existing = await this.prisma.conversationParticipant.findFirst({
            where: { conversationId, userId },
        });
        if (existing) throw new ConflictException('User is already a participant in this conversation');

        return this.prisma.conversationParticipant.create({
            data: { conversationId, userId },
            include: { user: true },
        });
    }

    // ─── Remove Participant ───────────────────────────────────────────────────

    async removeParticipant(conversationId: number, userId: number) {
        const existing = await this.prisma.conversationParticipant.findFirst({
            where: { conversationId, userId },
        });
        if (!existing) throw new NotFoundException('Participant not found in this conversation');

        return this.prisma.conversationParticipant.delete({
            where: { id: existing.id },
        });
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    async remove(id: number) {
        return this.prisma.conversation.update({
            where: { id },
            data: {
                participants: {
                    deleteMany: {},
                },
            }
        }).then(() => this.prisma.conversation.delete({ where: { id } }));
    }
}
