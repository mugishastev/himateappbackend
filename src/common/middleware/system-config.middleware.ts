import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemConfigMiddleware implements NestMiddleware {
    private redisClient: Redis;

    constructor(private prisma: PrismaService) {
        this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            connectTimeout: 15000,
            maxRetriesPerRequest: null,
            retryStrategy: (times) => Math.min(times * 100, 3000),
        });
    }

    async use(req: Request, res: Response, next: NextFunction) {
        const path = req.path || '';

        // ─── 1. MAINTENANCE MODE INTERCEPTION ─────────────────────────
        let maintenanceMode = await this.redisClient.get('system_config:maintenance_mode');
        if (!maintenanceMode) {
            const dbSetting = await this.prisma.setting.findFirst({ where: { key: 'maintenance_mode' } });
            maintenanceMode = dbSetting ? dbSetting.value : 'false';
            await this.redisClient.set('system_config:maintenance_mode', maintenanceMode);
        }

        if (maintenanceMode === 'true') {
            const isApiAdmin = path.includes('/admin');
            const isApiLogin = path.includes('/auth/login');
            const isApiProfile = path.includes('/auth/profile') || path.includes('/auth/me');

            if (!isApiAdmin && !isApiLogin && !isApiProfile) {
                let maintenanceMessage = await this.redisClient.get('system_config:maintenance_message');
                if (!maintenanceMessage) {
                    const dbMsg = await this.prisma.setting.findFirst({ where: { key: 'maintenance_message' } });
                    maintenanceMessage = dbMsg ? dbMsg.value : "We'll be right back.";
                    await this.redisClient.set('system_config:maintenance_message', maintenanceMessage);
                }

                throw new HttpException(
                    {
                        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                        message: maintenanceMessage,
                        maintenance: true,
                    },
                    HttpStatus.SERVICE_UNAVAILABLE
                );
            }
        }

        // ─── 2. API RATE LIMITING (SLIDING WINDOW) ────────────────────
        // Rate limit unauthenticated endpoints only
        const isAuthHeaderPresent = !!req.headers.authorization;
        if (!isAuthHeaderPresent && !path.includes('/admin')) {
            let rateLimiting = await this.redisClient.get('system_config:rate_limiting');
            if (!rateLimiting) {
                const dbSetting = await this.prisma.setting.findFirst({ where: { key: 'rate_limiting' } });
                rateLimiting = dbSetting ? dbSetting.value : 'false';
                await this.redisClient.set('system_config:rate_limiting', rateLimiting);
            }

            if (rateLimiting === 'true') {
                const ip = req.ip || req.socket.remoteAddress || 'unknown';
                const key = `ratelimit:${ip}`;
                const now = Date.now();
                const oneMinuteAgo = now - 60000;

                try {
                    const pipeline = this.redisClient.pipeline();
                    pipeline.zremrangebyscore(key, 0, oneMinuteAgo);
                    pipeline.zadd(key, now, now.toString());
                    pipeline.zcard(key);
                    pipeline.expire(key, 60);

                    const results = await pipeline.exec();
                    const count = results ? (results[2][1] as number) : 0;

                    if (count > 60) {
                        throw new HttpException(
                            {
                                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                                message: 'Too many requests. Please try again in a minute.',
                            },
                            HttpStatus.TOO_MANY_REQUESTS
                        );
                    }
                } catch (err: any) {
                    if (err instanceof HttpException) throw err;
                    console.error('[RateLimitMiddleware] Redis pipeline error:', err.message);
                }
            }
        }

        next();
    }
}
