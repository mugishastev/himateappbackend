import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';
import { CloudinaryService } from '../utils/cloudinary.service';

@Injectable()
export class StatusesService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) { }

    async create(createStatusDto: CreateStatusDto, file?: Express.Multer.File) {
        let mediaUrl = createStatusDto.mediaUrl;
        if (file) {
            const result = await this.cloudinary.uploadImage(file);
            mediaUrl = result.secure_url;
        }

        return this.prisma.status.create({
            data: {
                ...createStatusDto,
                mediaUrl,
            },
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.status.findMany({
                skip,
                take,
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.status.count(),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findByUser(userId: number, paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.status.findMany({
                where: { userId },
                skip,
                take,
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.status.count({ where: { userId } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const status = await this.prisma.status.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!status) throw new NotFoundException(`Status with ID ${id} not found`);
        return status;
    }

    async update(id: number, updateStatusDto: UpdateStatusDto) {
        return this.prisma.status.update({
            where: { id },
            data: updateStatusDto,
        });
    }

    async remove(id: number) {
        return this.prisma.status.delete({
            where: { id },
        });
    }
}
