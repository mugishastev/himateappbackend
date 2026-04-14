import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { mockPrismaService } from '../../test/mocks/prisma.service.mock';

describe('ConversationsService', () => {
    let service: ConversationsService;
    let prisma: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConversationsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<ConversationsService>(ConversationsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a conversation with participants', async () => {
            const dto = { userIds: [1, 2], title: 'Test Group', isGroup: true };
            mockPrismaService.conversation.create.mockResolvedValue({ id: 1, ...dto });

            const result = await service.create(dto, 1);
            expect(result.id).toBe(1);
            expect(mockPrismaService.conversation.create).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return conversation if user is a participant', async () => {
            const conv = { id: 1, participants: [{ userId: 1 }, { userId: 2 }] };
            mockPrismaService.conversation.findUnique.mockResolvedValue(conv);

            const result = await service.findOne(1, 1, 'USER');
            expect(result).toEqual(conv);
        });

        it('should allow ADMIN to view conversation even if not a participant', async () => {
            const conv = { id: 1, participants: [{ userId: 2 }] };
            mockPrismaService.conversation.findUnique.mockResolvedValue(conv);

            const result = await service.findOne(1, 1, 'ADMIN');
            expect(result).toEqual(conv);
        });

        it('should throw UnauthorizedException if non-admin is not a participant', async () => {
            const conv = { id: 1, participants: [{ userId: 2 }] };
            mockPrismaService.conversation.findUnique.mockResolvedValue(conv);

            await expect(service.findOne(1, 1, 'USER')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('addParticipant', () => {
        it('should add participant if not already in conversation', async () => {
            mockPrismaService.conversationParticipant.findFirst
                .mockResolvedValueOnce({ id: 10, conversationId: 1, userId: 1 })
                .mockResolvedValueOnce(null);
            mockPrismaService.conversationParticipant.create.mockResolvedValue({ id: 1 });

            const result = await service.addParticipant(1, 3, 1, 'USER');
            expect(result.id).toBe(1);
            expect(mockPrismaService.conversationParticipant.create).toHaveBeenCalled();
        });

        it('should throw ConflictException if already a participant', async () => {
            mockPrismaService.conversationParticipant.findFirst
                .mockResolvedValueOnce({ id: 10, conversationId: 1, userId: 1 })
                .mockResolvedValueOnce({ id: 1 });

            await expect(service.addParticipant(1, 1, 1, 'USER')).rejects.toThrow(ConflictException);
        });
    });
});
