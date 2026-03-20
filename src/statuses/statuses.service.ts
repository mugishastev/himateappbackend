import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

        // Force exactly 24 hours expiration 
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        return this.prisma.status.create({
            data: {
                content: createStatusDto.content,
                mediaUrl,
                expiresAt,
                user: {
                    connect: { id: createStatusDto.userId! },
                },
            },
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.status.findMany({
                where: { expiresAt: { gt: new Date() } },
                skip,
                take,
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.status.count({ where: { expiresAt: { gt: new Date() } } }),
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
                where: { userId, expiresAt: { gt: new Date() } },
                skip,
                take,
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.status.count({ where: { userId, expiresAt: { gt: new Date() } } }),
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

    async update(id: number, updateStatusDto: UpdateStatusDto, currentUserId: number, currentUserRole: any) {
        const status = await this.findOne(id);
        const roleName = typeof currentUserRole === 'string' ? currentUserRole : currentUserRole?.name;
        if (status.userId !== currentUserId && roleName !== 'ADMIN') {
            throw new UnauthorizedException('You can only update your own status');
        }

        return this.prisma.status.update({
            where: { id },
            data: updateStatusDto,
        });
    }

    async remove(id: number, currentUserId: number, currentUserRole: any) {
        const status = await this.findOne(id);
        const roleName = typeof currentUserRole === 'string' ? currentUserRole : currentUserRole?.name;
        if (status.userId !== currentUserId && roleName !== 'ADMIN') {
            throw new UnauthorizedException('You can only delete your own status');
        }

        return this.prisma.status.delete({
            where: { id },
        });
    }
}
