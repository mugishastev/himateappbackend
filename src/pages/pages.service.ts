import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto, CreatePagePostDto } from './dto/page.dto';
import { Redis } from 'ioredis';

@Injectable()
export class PagesService {
    private redisClient: Redis;

    constructor(private prisma: PrismaService) {
        // We initialize a Redis Pub/Sub client here for mass broadcasting functionality
        this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }

    async createPage(userId: number, createPageDto: CreatePageDto) {
        const existingPage = await this.prisma.page.findUnique({
            where: { handle: createPageDto.handle },
        });

        if (existingPage) {
            throw new BadRequestException('A page with this handle already exists.');
        }

        return this.prisma.page.create({
            data: {
                ...createPageDto,
                ownerId: userId,
            },
        });
    }

    async getDiscoverPages() {
        return this.prisma.page.findMany({
            take: 20,
            orderBy: { followers: { _count: 'desc' } },
            include: {
                _count: { select: { followers: true } },
            },
        });
    }

    async getPageByHandle(handle: string) {
        const page = await this.prisma.page.findUnique({
            where: { handle },
            include: {
                _count: { select: { followers: true } },
                posts: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!page) throw new NotFoundException('Page not found');
        return page;
    }

    async followPage(userId: number, pageId: number) {
        const page = await this.prisma.page.findUnique({ where: { id: pageId } });
        if (!page) throw new NotFoundException('Page not found');

        // Upsert to handle existing follows safely
        await this.prisma.pageFollower.upsert({
            where: {
                pageId_userId: { pageId, userId },
            },
            create: { pageId, userId },
            update: {}, // do nothing if it exists
        });

        return { success: true, message: 'Successfully followed page' };
    }

    async createPost(userId: number, pageId: number, dto: CreatePagePostDto) {
        const page = await this.prisma.page.findUnique({ where: { id: pageId } });
        if (!page) throw new NotFoundException('Page not found');
        if (page.ownerId !== userId) {
            throw new BadRequestException('Only the real owner can publish posts.');
        }

        const newPost = await this.prisma.pagePost.create({
            data: {
                pageId,
                content: dto.content,
                mediaUrls: dto.mediaUrls || [],
            },
        });

        // Mass broadcasting using Redis Pub/Sub
        // This stops Node.js from blocking the event loop on 1 million followers!
        const broadcastPayload = {
            type: 'NEW_PAGE_POST',
            pageId,
            post: newPost,
        };
        await this.redisClient.publish(`page_updates_${pageId}`, JSON.stringify(broadcastPayload));

        return newPost;
    }
}
