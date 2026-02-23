import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/contact.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class ContactsService {
    constructor(private prisma: PrismaService) { }

    async create(createContactDto: CreateContactDto) {
        return this.prisma.contact.create({
            data: createContactDto,
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.contact.findMany({
                skip,
                take,
                include: { owner: true, contact: true },
            }),
            this.prisma.contact.count(),
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
            this.prisma.contact.findMany({
                where: { ownerId: userId },
                skip,
                take,
                include: { contact: true },
            }),
            this.prisma.contact.count({ where: { ownerId: userId } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async remove(id: number) {
        return this.prisma.contact.delete({
            where: { id },
        });
    }
}
