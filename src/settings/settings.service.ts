import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async create(createSettingDto: CreateSettingDto) {
        return this.prisma.setting.create({
            data: createSettingDto,
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

    async findOne(id: number) {
        const setting = await this.prisma.setting.findUnique({
            where: { id },
        });
        if (!setting) throw new NotFoundException(`Setting with ID ${id} not found`);
        return setting;
    }

    async update(id: number, updateSettingDto: UpdateSettingDto) {
        return this.prisma.setting.update({
            where: { id },
            data: updateSettingDto,
        });
    }

    async remove(id: number) {
        return this.prisma.setting.delete({
            where: { id },
        });
    }
}
