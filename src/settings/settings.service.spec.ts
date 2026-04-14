import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mockPrismaService } from '../../test/mocks/prisma.service.mock';

describe('SettingsService', () => {
    let service: SettingsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettingsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<SettingsService>(SettingsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findOne', () => {
        it('should throw NotFoundException when setting is missing', async () => {
            mockPrismaService.setting.findUnique.mockResolvedValue(null);
            await expect(service.findOne(1, 10, false)).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException when user does not own setting', async () => {
            mockPrismaService.setting.findUnique.mockResolvedValue({ id: 1, userId: 20 });
            await expect(service.findOne(1, 10, false)).rejects.toThrow(ForbiddenException);
        });
    });
});
