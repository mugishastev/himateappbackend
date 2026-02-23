import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class PermissionsService {
    constructor(private prisma: PrismaService) { }

    async create(createPermissionDto: CreatePermissionDto) {
        return this.prisma.permission.create({
            data: createPermissionDto,
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.permission.findMany({
                skip,
                take,
                include: { role: true },
            }),
            this.prisma.permission.count(),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const permission = await this.prisma.permission.findUnique({
            where: { id },
            include: {
                role: true,
            },
        });
        if (!permission) throw new NotFoundException(`Permission with ID ${id} not found`);
        return permission;
    }

    async update(id: number, updatePermissionDto: UpdatePermissionDto) {
        return this.prisma.permission.update({
            where: { id },
            data: updatePermissionDto,
        });
    }

    async remove(id: number) {
        return this.prisma.permission.delete({
            where: { id },
        });
    }
}
