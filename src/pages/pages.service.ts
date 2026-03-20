import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto, CreatePagePostDto } from './dto/page.dto';
import { Redis } from 'ioredis';
import { FcmService } from '../notifications/fcm.service';
import { CloudinaryService } from '../utils/cloudinary.service';

@Injectable()
export class PagesService {
    private redisClient: Redis;

    constructor(
        private readonly prisma: PrismaService,
        private readonly fcmService: FcmService,
        private readonly cloudinary: CloudinaryService
    ) {
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

    async updatePage(userId: number, pageId: number, updateDto: Partial<CreatePageDto>) {
        const page = await this.prisma.page.findUnique({ where: { id: pageId } });
        if (!page) throw new NotFoundException('Page not found');
        if (page.ownerId !== userId) {
            throw new UnauthorizedException('You do not own this page.');
        }

        // Handle uniqueness if changing handle
        if (updateDto.handle && updateDto.handle !== page.handle) {
            const existing = await this.prisma.page.findUnique({ where: { handle: updateDto.handle } });
            if (existing) throw new BadRequestException('Handle already taken');
        }

        return this.prisma.page.update({
            where: { id: pageId },
            data: updateDto,
        });
    }

    async getDiscoverPages(search?: string) {
        return this.prisma.page.findMany({
            where: search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { handle: { contains: search, mode: 'insensitive' } },
                    { bio: { contains: search, mode: 'insensitive' } },
                ]
            } : {},
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
                    include: {
                        _count: { select: { reactions: true } }
                    }
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

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user && user.fcmToken) {
            // Native Offline Push Notification Registration!
            // When user goes offline, Google Firebase knows they follow this topic.
            await this.fcmService.subscribeToTopic([user.fcmToken], `page_${pageId}`);
        }

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

        // 1. Live WebSocket mass broadcast (for users watching the app)
        const broadcastPayload = {
            type: 'NEW_PAGE_POST',
            pageId,
            post: newPost,
        };
        await this.redisClient.publish(`page_updates_${pageId}`, JSON.stringify(broadcastPayload));

        // 2. Offline Google Server Push Notifications
        // Send exactly 1 Firebase Request, Google fans it out to 1,000,000 phones mapping to 'page_X'
        try {
            await this.fcmService.sendToTopic(
                `page_${pageId}`, 
                `New Post from ${page.name} ☑️`, 
                dto.content.substring(0, 100) + '...',
                { pageId: pageId.toString(), postId: newPost.id.toString() }
            );
        } catch (err) {
            console.error('Failed to trigger FCM Offline push', err);
        }

        return newPost;
    }

    async toggleReaction(userId: number, postId: number, emoji: string) {
        const existing = await this.prisma.postReaction.findFirst({
            where: { postId, userId }
        });

        if (existing) {
            if (existing.emoji === emoji) {
                // Remove if same emoji (unlike)
                return this.prisma.postReaction.delete({ where: { id: existing.id } });
            } else {
                // Update emoji
                return this.prisma.postReaction.update({
                    where: { id: existing.id },
                    data: { emoji }
                });
            }
        }

        return this.prisma.postReaction.create({
            data: { userId, postId, emoji }
        });
    }

    async deletePost(userId: number, postId: number) {
        const post = await this.prisma.pagePost.findUnique({
            where: { id: postId },
            include: { page: true }
        });

        if (!post) throw new NotFoundException('Post not found');
        if (post.page.ownerId !== userId) {
            throw new UnauthorizedException('You do not own the page that published this post.');
        }

        // Delete reactions first
        await this.prisma.postReaction.deleteMany({ where: { postId } });
        return this.prisma.pagePost.delete({ where: { id: postId } });
    }

    async uploadMedia(file: any) {
        if (!file) throw new BadRequestException('File is required');
        const result = await this.cloudinary.uploadImage(file);
        return { url: result.secure_url };
    }

    async incrementPostViews(postId: number) {
        return this.prisma.pagePost.update({
            where: { id: postId },
            data: { views: { increment: 1 } }
        });
    }

    async getMyPages(ownerId: number) {
        return this.prisma.page.findMany({
            where: { ownerId },
            include: {
                _count: {
                    select: { followers: true, posts: true }
                }
            }
        });
    }

    async getPageAnalytics(userId: number, pageId: number) {
        const page = await this.prisma.page.findUnique({
            where: { id: pageId },
        });
        if (!page || page.ownerId !== userId) {
            throw new UnauthorizedException('Access denied to page analytics');
        }

        const followersCount = await this.prisma.pageFollower.count({ where: { pageId } });
        const postsCount = await this.prisma.pagePost.count({ where: { pageId } });
        
        // Summing up views from all posts
        const posts = await this.prisma.pagePost.findMany({ where: { pageId }, select: { views: true } });
        const totalViews = posts.reduce((sum, p) => sum + p.views, 0);

        return {
            followersCount,
            postsCount,
            totalViews,
            unreadTickets: 0 // In a real app, query unread messages/conversations
        };
    }

    async getPageConversations(userId: number, pageId: number) {
        const page = await this.prisma.page.findUnique({ where: { id: pageId } });
        if (!page || page.ownerId !== userId) {
            throw new UnauthorizedException('Access denied to page inbox');
        }

        return this.prisma.conversation.findMany({
            where: { pageId },
            include: {
                participants: { include: { user: true } },
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                }
            }
        });
    }

    async messagePage(userId: number, pageId: number) {
        const page = await this.prisma.page.findUnique({ where: { id: pageId } });
        if (!page) throw new NotFoundException('Page not found');

        // Check if a support conversation already exists between this user and this page
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                pageId: pageId,
                participants: { some: { userId: userId } }
            },
            include: { participants: true }
        });

        if (!conversation) {
            // Create a new support ticket conversation
            conversation = await this.prisma.conversation.create({
                data: {
                    pageId: pageId,
                    isGroup: false,
                    participants: {
                        createMany: {
                            data: [
                                { userId: userId },
                                { userId: page.ownerId } // Add the page owner as a participant
                            ]
                        }
                    }
                },
                include: { participants: true }
            });
        }

        return conversation;
    }
}
