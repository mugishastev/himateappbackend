import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: number, createSettingDto: CreateSettingDto) {
        return this.prisma.setting.create({
            data: {
                ...createSettingDto,
                userId,
            },
        });
    }

    async findByUser(userId: number, paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.setting.findMany({
                where: { userId },
                skip,
                take,
            }),
            this.prisma.setting.count({ where: { userId } }),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number, currentUserId: number, isAdmin = false) {
        const setting = await this.prisma.setting.findUnique({
            where: { id },
        });
        if (!setting) throw new NotFoundException(`Setting with ID ${id} not found`);
        if (!isAdmin && setting.userId !== currentUserId) {
            throw new ForbiddenException('You can only access your own settings');
        }
        return setting;
    }

    async update(id: number, updateSettingDto: UpdateSettingDto, currentUserId: number, isAdmin = false) {
        await this.findOne(id, currentUserId, isAdmin);
        return this.prisma.setting.update({
            where: { id },
            data: updateSettingDto,
        });
    }

    async remove(id: number, currentUserId: number, isAdmin = false) {
        await this.findOne(id, currentUserId, isAdmin);
        return this.prisma.setting.delete({
            where: { id },
        });
    }
}
