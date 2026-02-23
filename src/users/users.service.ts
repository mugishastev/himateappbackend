import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationDto, getPaginationParams } from '../utils/pagination.util';
import { CloudinaryService } from '../utils/cloudinary.service';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) { }

    async create(createUserDto: CreateUserDto) {
        return this.prisma.user.create({
            data: createUserDto,
        });
    }

    async findAll(paginationDto: PaginationDto) {
        const { skip, take } = getPaginationParams(paginationDto);
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take,
                include: { role: true },
            }),
            this.prisma.user.count(),
        ]);

        return {
            data,
            total,
            page: paginationDto.page,
            limit: paginationDto.limit,
        };
    }

    async findOne(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!user) throw new NotFoundException(`User with ID ${id} not found`);
        return user;
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id },
            data: updateUserDto,
        });
    }

    async updateProfileImage(id: number, file: Express.Multer.File) {
        const user = await this.findOne(id);
        const result = await this.cloudinary.uploadImage(file);

        return this.prisma.user.update({
            where: { id },
            data: { profileImage: result.secure_url },
        });
    }

    async remove(id: number) {
        return this.prisma.user.delete({
            where: { id },
        });
    }
}
