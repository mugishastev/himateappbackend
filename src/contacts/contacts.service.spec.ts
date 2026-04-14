import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { mockPrismaService } from '../../test/mocks/prisma.service.mock';

describe('ContactsService', () => {
    let service: ContactsService;
    let prisma: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContactsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<ContactsService>(ContactsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a contact if it does not exist', async () => {
            const dto = { ownerId: 1, contactId: 2 };
            mockPrismaService.contact.findFirst.mockResolvedValue(null);
            mockPrismaService.contact.create.mockResolvedValue({ id: 1, ...dto });

            const result = await service.create(dto);
            expect(result.id).toBe(1);
            expect(mockPrismaService.contact.create).toHaveBeenCalled();
        });

        it('should throw ConflictException if contact already exists', async () => {
            const dto = { ownerId: 1, contactId: 2 };
            mockPrismaService.contact.findFirst.mockResolvedValue({ id: 1 });

            await expect(service.create(dto)).rejects.toThrow(ConflictException);
        });
    });

    describe('findOne', () => {
        it('should return a contact if found', async () => {
            const contact = { id: 1, ownerId: 1, contactId: 2 };
            mockPrismaService.contact.findUnique.mockResolvedValue(contact);

            const result = await service.findOne(1, 1);
            expect(result).toEqual(contact);
        });

        it('should throw NotFoundException if contact not found', async () => {
            mockPrismaService.contact.findUnique.mockResolvedValue(null);

            await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if user does not own the contact', async () => {
            mockPrismaService.contact.findUnique.mockResolvedValue({ id: 1, ownerId: 2, contactId: 3 });

            await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('remove', () => {
        it('should delete a contact if it exists', async () => {
            mockPrismaService.contact.findUnique.mockResolvedValue({ id: 1, ownerId: 1 });
            mockPrismaService.contact.delete.mockResolvedValue({ id: 1 });

            const result = await service.remove(1, 1);
            expect(result.id).toBe(1);
            expect(mockPrismaService.contact.delete).toHaveBeenCalled();
        });
    });
});
