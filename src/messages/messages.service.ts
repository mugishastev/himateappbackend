import { Injectable, NotFoundException } from '@nestjs/common';
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
        if (file) {
            const result = await this.cloudinary.uploadImage(file);
            mediaUrl = result.secure_url;
        }

        return this.prisma.message.create({
            data: {
                ...createMessageDto,
                content: createMessageDto.content || '',
                mediaUrl,
            },
            include: { sender: true },
        });
    }

    // ─── Find All in Conversation ─────────────────────────────────────────────

    async findByConversation(conversationId: number, paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { conversationId },
                skip,
                take,
                orderBy: { timestamp: 'desc' },
                include: { sender: true, attachments: true },
            }),
            this.prisma.message.count({ where: { conversationId } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    // ─── Find One ─────────────────────────────────────────────────────────────

    async findOne(id: number) {
        const message = await this.prisma.message.findUnique({
            where: { id },
            include: { sender: true, attachments: true },
        });
        if (!message) throw new NotFoundException(`Message with ID ${id} not found`);
        return message;
    }

    // ─── Mark as Read ─────────────────────────────────────────────────────────

    async markAsRead(id: number) {
        const message = await this.prisma.message.findUnique({ where: { id } });
        if (!message) throw new NotFoundException(`Message with ID ${id} not found`);

        return this.prisma.message.update({
            where: { id },
            data: { isRead: true, isDelivered: true },
        });
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    async remove(id: number) {
        const message = await this.prisma.message.findUnique({ where: { id } });
        if (!message) throw new NotFoundException(`Message with ID ${id} not found`);

        return this.prisma.message.delete({ where: { id } });
    }
}
