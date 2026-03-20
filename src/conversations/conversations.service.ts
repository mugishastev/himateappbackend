import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
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

    async findByUser(userId: number, userRole: string, paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);

        // If ADMIN, don't filter by participation
        const where = userRole === 'ADMIN' ? {} : { participants: { some: { userId } } };

        const [rawConversations, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where,
                skip,
                take,
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    profileImage: true,
                                    email: true,
                                    lastSeen: true,
                                    bio: true,
                                },
                            },
                        },
                    },
                    messages: {
                        where: { isDeleted: false },
                        take: 1,
                        orderBy: { timestamp: 'desc' },
                        include: {
                            sender: {
                                select: { id: true, username: true },
                            },
                        },
                    },
                },
                // Sort by latest message timestamp, falling back to conversation creation
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.conversation.count({ where }),
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
                // Expose the latest message as a top-level field
                const lastMessage = conv.messages[0] ?? null;
                return { ...conv, unreadCount, lastMessage };
            }),
        );

        // Re-sort by latest message timestamp
        data.sort((a, b) => {
            const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : new Date(a.createdAt).getTime();
            const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : new Date(b.createdAt).getTime();
            return bTime - aTime;
        });

        return { data, total, page: paginationDto.page, limit: paginationDto.limit };
    }

    // ─── Find One ─────────────────────────────────────────────────────────────

    async findOne(id: number, userId: number, userRole: string) {
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

        // If not ADMIN, verify participation
        if (userRole !== 'ADMIN') {
            const isParticipant = conversation.participants.some(p => p.userId === userId);
            if (!isParticipant) throw new UnauthorizedException('You are not a participant in this conversation');
        }

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
        return this.prisma.$transaction([
            // 1. Delete all messages in the conversation first
            this.prisma.message.deleteMany({ where: { conversationId: id } }),
            // 2. Delete all participants
            this.prisma.conversationParticipant.deleteMany({ where: { conversationId: id } }),
            // 3. Finally delete the conversation itself
            this.prisma.conversation.delete({ where: { id } }),
        ]);
    }
}
