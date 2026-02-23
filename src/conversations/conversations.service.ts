import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class ConversationsService {
    constructor(private prisma: PrismaService) { }

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
                participants: true,
            },
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.conversation.findMany({
                skip,
                take,
                include: {
                    participants: {
                        include: { user: true },
                    },
                    messages: {
                        take: 1,
                        orderBy: { timestamp: 'desc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.conversation.count(),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: {
                    include: { user: true },
                },
                messages: {
                    take: 50,
                    orderBy: { timestamp: 'desc' },
                },
            },
        });
        if (!conversation) throw new NotFoundException(`Conversation with ID ${id} not found`);
        return conversation;
    }

    async update(id: number, updateConversationDto: UpdateConversationDto) {
        return this.prisma.conversation.update({
            where: { id },
            data: updateConversationDto,
        });
    }

    async remove(id: number) {
        return this.prisma.conversation.delete({
            where: { id },
        });
    }
}
