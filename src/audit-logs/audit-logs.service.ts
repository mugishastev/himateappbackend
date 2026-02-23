import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/audit-log.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class AuditLogsService {
    constructor(private prisma: PrismaService) { }

    async create(createAuditLogDto: CreateAuditLogDto) {
        return this.prisma.auditLog.create({
            data: createAuditLogDto,
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                skip,
                take,
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count(),
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
            this.prisma.auditLog.findMany({
                where: { userId },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count({ where: { userId } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const auditLog = await this.prisma.auditLog.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!auditLog) throw new NotFoundException(`AuditLog with ID ${id} not found`);
        return auditLog;
    }
}
