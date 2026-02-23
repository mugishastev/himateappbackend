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

    async create(createMessageDto: CreateMessageDto, file?: Express.Multer.File) {
        let mediaUrl = null;
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
        });
    }

    async findByConversation(conversationId: number, paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { conversationId },
                skip,
                take,
                orderBy: { timestamp: 'desc' },
                include: { sender: true },
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

    async findOne(id: number) {
        const message = await this.prisma.message.findUnique({
            where: { id },
            include: { sender: true },
        });
        if (!message) throw new NotFoundException(`Message with ID ${id} not found`);
        return message;
    }

    async remove(id: number) {
        return this.prisma.message.delete({
            where: { id },
        });
    }
}
