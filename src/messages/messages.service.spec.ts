import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../utils/cloudinary.service';
import { NotFoundException } from '@nestjs/common';
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
            await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
        });

        it('should return the message if it exists', async () => {
            const mockMessage = { id: 1, content: 'hello' };
            mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
            const result = await service.findOne(1);
            expect(result).toEqual(mockMessage);
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
