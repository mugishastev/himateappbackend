import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

    async scheduleCall(data: any) {
        return this.prisma.scheduledCall.create({
            data: {
                callerId: data.callerId,
                receiverId: data.receiverId,
                scheduledAt: new Date(data.scheduledAt),
                type: data.type || 'AUDIO',
            }
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

    async findOne(id: number, currentUserId: number, isAdmin = false) {
        const call = await this.prisma.call.findUnique({
            where: { id },
            include: { caller: true, receiver: true },
        });
        if (!call) throw new NotFoundException(`Call with ID ${id} not found`);
        if (!isAdmin && call.callerId !== currentUserId && call.receiverId !== currentUserId) {
            throw new ForbiddenException('You can only access your own calls');
        }
        return call;
    }

    async update(id: number, updateCallDto: UpdateCallDto, currentUserId: number, isAdmin = false) {
        await this.findOne(id, currentUserId, isAdmin);
        return this.prisma.call.update({
            where: { id },
            data: updateCallDto,
        });
    }

    async remove(id: number, currentUserId: number, isAdmin = false) {
        await this.findOne(id, currentUserId, isAdmin);
        return this.prisma.call.delete({
            where: { id },
        });
    }
}
