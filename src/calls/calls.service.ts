import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCallDto, UpdateCallDto } from './dto/call.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class CallsService {
    constructor(private prisma: PrismaService) { }

    async create(createCallDto: CreateCallDto) {
        return this.prisma.call.create({
            data: createCallDto,
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.call.findMany({
                skip,
                take,
                include: { caller: true, receiver: true },
                orderBy: { startedAt: 'desc' },
            }),
            this.prisma.call.count(),
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
            this.prisma.call.findMany({
                where: {
                    OR: [{ callerId: userId }, { receiverId: userId }],
                },
                skip,
                take,
                include: { caller: true, receiver: true },
                orderBy: { startedAt: 'desc' },
            }),
            this.prisma.call.count({
                where: {
                    OR: [{ callerId: userId }, { receiverId: userId }],
                },
            }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const call = await this.prisma.call.findUnique({
            where: { id },
            include: { caller: true, receiver: true },
        });
        if (!call) throw new NotFoundException(`Call with ID ${id} not found`);
        return call;
    }

    async update(id: number, updateCallDto: UpdateCallDto) {
        return this.prisma.call.update({
            where: { id },
            data: updateCallDto,
        });
    }

    async remove(id: number) {
        return this.prisma.call.delete({
            where: { id },
        });
    }
}
