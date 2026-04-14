import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class ConversationsService {
    constructor(private prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(createConversationDto: CreateConversationDto, currentUserId: number) {
        const uniqueUserIds = Array.from(new Set([...(createConversationDto.userIds || []), currentUserId]));
        const { userIds, ...data } = createConversationDto;
        return this.prisma.conversation.create({
            data: {
                ...data,
                participants: {
                    create: uniqueUserIds.map((userId) => ({ userId })),
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
        const roleName = typeof userRole === 'string' ? userRole : (userRole as any)?.name;

        // If ADMIN, don't filter by participation
        const where = roleName === 'ADMIN' ? {} : { participants: { some: { userId } } };

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

        // Get unread counts for all these conversations in one query (avoid N+1)
        const unreadCounts = await this.prisma.message.groupBy({
            by: ['conversationId'],
            where: {
                conversationId: { in: rawConversations.map(c => c.id) },
                senderId: { not: userId },
                isRead: false,
                isDeleted: false,
            },
            _count: { id: true },
        });

        const data = rawConversations.map((conv) => {
            const countObj = unreadCounts.find((c) => c.conversationId === conv.id);
            const unreadCount = countObj?._count.id || 0;
            const lastMessage = conv.messages[0] ?? null;
            return {
                ...conv,
                unreadCount,
                lastMessage,
            };
        });

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
        const roleName = typeof userRole === 'string' ? userRole : (userRole as any)?.name;
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
        if (roleName !== 'ADMIN') {
            const isParticipant = conversation.participants.some(p => p.userId === userId);
            if (!isParticipant) throw new UnauthorizedException('You are not a participant in this conversation');
        }

        return conversation;
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    async update(id: number, updateConversationDto: UpdateConversationDto, currentUserId: number, currentUserRole: string) {
        await this.assertCanManageConversation(id, currentUserId, currentUserRole);
        return this.prisma.conversation.update({
            where: { id },
            data: updateConversationDto,
        });
    }

    // ─── Add Participant ──────────────────────────────────────────────────────

    async addParticipant(conversationId: number, userId: number, currentUserId: number, currentUserRole: string) {
        await this.assertCanManageConversation(conversationId, currentUserId, currentUserRole);
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

    async removeParticipant(conversationId: number, userId: number, currentUserId: number, currentUserRole: string) {
        await this.assertCanManageConversation(conversationId, currentUserId, currentUserRole);
        const existing = await this.prisma.conversationParticipant.findFirst({
            where: { conversationId, userId },
        });
        if (!existing) throw new NotFoundException('Participant not found in this conversation');

        return this.prisma.conversationParticipant.delete({
            where: { id: existing.id },
        });
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    async remove(id: number, currentUserId: number, currentUserRole: string) {
        await this.assertCanManageConversation(id, currentUserId, currentUserRole);
        return this.prisma.$transaction([
            // 1. Delete all messages in the conversation first
            this.prisma.message.deleteMany({ where: { conversationId: id } }),
            // 2. Delete all participants
            this.prisma.conversationParticipant.deleteMany({ where: { conversationId: id } }),
            // 3. Finally delete the conversation itself
            this.prisma.conversation.delete({ where: { id } }),
        ]);
    }

    private async assertCanManageConversation(conversationId: number, userId: number, userRole: string) {
        const roleName = typeof userRole === 'string' ? userRole : (userRole as any)?.name;
        if (roleName === 'ADMIN') {
            return;
        }

        const participant = await this.prisma.conversationParticipant.findFirst({
            where: { conversationId, userId },
        });

        if (!participant) {
            throw new UnauthorizedException('You are not a participant in this conversation');
        }
    }
}
