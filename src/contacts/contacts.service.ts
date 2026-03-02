import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/contact.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class ContactsService {
    constructor(private prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(createContactDto: CreateContactDto) {
        const existing = await this.prisma.contact.findFirst({
            where: {
                ownerId: createContactDto.ownerId,
                contactId: createContactDto.contactId,
            },
        });
        if (existing) throw new ConflictException('Contact already exists');

        return this.prisma.contact.create({
            data: createContactDto,
            include: { contact: true, owner: true },
        });
    }

    // ─── Find All ─────────────────────────────────────────────────────────────

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

        return { data, total, page: paginationDto.page, limit: paginationDto.limit };
    }

    // ─── Find by User ─────────────────────────────────────────────────────────

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

        return { data, total, page: paginationDto.page, limit: paginationDto.limit };
    }

    // ─── Find One ─────────────────────────────────────────────────────────────

    async findOne(id: number) {
        const contact = await this.prisma.contact.findUnique({
            where: { id },
            include: { owner: true, contact: true },
        });
        if (!contact) throw new NotFoundException(`Contact with ID ${id} not found`);
        return contact;
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    async remove(id: number) {
        const contact = await this.prisma.contact.findUnique({ where: { id } });
        if (!contact) throw new NotFoundException(`Contact with ID ${id} not found`);
        return this.prisma.contact.delete({ where: { id } });
    }
}
