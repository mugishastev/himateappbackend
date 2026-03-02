import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../utils/cloudinary.service';
import { NotFoundException } from '@nestjs/common';
import { mockPrismaService } from '../../test/mocks/prisma.service.mock';

describe('UsersService', () => {
    let service: UsersService;
    let prisma: any;

    const mockCloudinaryService = {
        uploadImage: jest.fn().mockResolvedValue({ secure_url: 'http://image.url' }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: CloudinaryService, useValue: mockCloudinaryService },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findOne', () => {
        it('should return a user if found', async () => {
            const user = { id: 1, email: 'test@example.com' };
            mockPrismaService.user.findUnique.mockResolvedValue(user);

            const result = await service.findOne(1);
            expect(result).toEqual(user);
        });

        it('should throw NotFoundException if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateProfileImage', () => {
        it('should update profile image URL', async () => {
            const mockFile = { buffer: Buffer.from('') } as Express.Multer.File;
            mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
            mockPrismaService.user.update.mockResolvedValue({ id: 1, profileImage: 'http://image.url' });

            const result = await service.updateProfileImage(1, mockFile);
            expect(result.profileImage).toBe('http://image.url');
        });
    });
});
