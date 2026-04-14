import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../utils/cloudinary.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { mockPrismaService } from '../../test/mocks/prisma.service.mock';

describe('MessagesService', () => {
    let service: MessagesService;
    let prisma: PrismaService;

    const mockCloudinaryService = {
        uploadImage: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: CloudinaryService, useValue: mockCloudinaryService },
            ],
        }).compile();

        service = module.get<MessagesService>(MessagesService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findOne', () => {
        it('should throw NotFoundException if message does not exist', async () => {
            mockPrismaService.message.findUnique.mockResolvedValue(null);
            await expect(service.findOne(1, 1, 'USER')).rejects.toThrow(NotFoundException);
        });

        it('should return the message if it exists', async () => {
            const mockMessage = { id: 1, content: 'hello', conversation: { participants: [{ userId: 1 }] } };
            mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
            const result = await service.findOne(1, 1, 'USER');
            expect(result).toEqual(mockMessage);
        });

        it('should throw UnauthorizedException if user is not a participant', async () => {
            const mockMessage = { id: 1, content: 'hello', conversation: { participants: [{ userId: 2 }] } };
            mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
            await expect(service.findOne(1, 1, 'USER')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('create', () => {
        it('should create a message', async () => {
            const dto = { content: 'test', senderId: 1, conversationId: 1 };
            mockPrismaService.message.create.mockResolvedValue({ id: 1, ...dto });

            const result = await service.create(dto);
            expect(prisma.message.create).toHaveBeenCalled();
            expect(result.id).toBe(1);
        });
    });
});
