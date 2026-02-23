import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    async create(createRoleDto: CreateRoleDto) {
        return this.prisma.role.create({
            data: createRoleDto,
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.role.findMany({
                skip,
                take,
                include: { permissions: true },
            }),
            this.prisma.role.count(),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                permissions: true,
            },
        });
        if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
        return role;
    }

    async update(id: number, updateRoleDto: UpdateRoleDto) {
        return this.prisma.role.update({
            where: { id },
            data: updateRoleDto,
        });
    }

    async remove(id: number) {
        return this.prisma.role.delete({
            where: { id },
        });
    }
}
