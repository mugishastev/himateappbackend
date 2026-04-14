import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { FcmService } from './fcm.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mockPrismaService } from '../../test/mocks/prisma.service.mock';

describe('NotificationsService', () => {
    let service: NotificationsService;

    const mockChatGateway = {
        sendDirectNotification: jest.fn(),
    };

    const mockFcmService = {
        sendPushNotification: jest.fn().mockResolvedValue(true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ChatGateway, useValue: mockChatGateway },
                { provide: FcmService, useValue: mockFcmService },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create notification, push realtime, and update delivery', async () => {
            const created = { id: 1, userId: 10, type: 'ALERT', content: 'hello' };
            const updated = { ...created, deliveryStatus: 'SENT' };
            mockPrismaService.notification.create.mockResolvedValue(created);
            mockPrismaService.user.findUnique.mockResolvedValue({ id: 10, fcmToken: 'token' });
            mockPrismaService.notification.update.mockResolvedValue(updated);

            const result = await service.create({ userId: 10, type: 'ALERT', content: 'hello' });

            expect(mockChatGateway.sendDirectNotification).toHaveBeenCalledWith(10, created);
            expect(mockFcmService.sendPushNotification).toHaveBeenCalled();
            expect(result.deliveryStatus).toBe('SENT');
        });
    });

    describe('update', () => {
        it('should throw NotFoundException when notification is missing', async () => {
            mockPrismaService.notification.findUnique.mockResolvedValue(null);
            await expect(service.update(1, { isRead: true }, 10, false)).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException when user does not own notification', async () => {
            mockPrismaService.notification.findUnique.mockResolvedValue({ id: 1, userId: 20 });
            await expect(service.update(1, { isRead: true }, 10, false)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('remove', () => {
        it('should throw ForbiddenException when user does not own notification', async () => {
            mockPrismaService.notification.findUnique.mockResolvedValue({ id: 1, userId: 20 });
            await expect(service.remove(1, 10, false)).rejects.toThrow(ForbiddenException);
        });
    });
});
