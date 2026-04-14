import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../utils/mail.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { mockPrismaService } from '../../test/mocks/prisma.service.mock';

jest.mock('ioredis', () => {
    const mockRedis = jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        quit: jest.fn(),
    }));
    return {
        Redis: mockRedis,
        default: mockRedis,
    };
});

describe('AuthService', () => {
    let service: AuthService;
    let prisma: PrismaService;

    const mockJwtService = {
        sign: jest.fn().mockReturnValue('mock-token'),
        verify: jest.fn(),
    };

    const mockMailService = {
        sendOtpEmail: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: MailService, useValue: mockMailService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('register', () => {
        it('should throw ConflictException if email exists', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({ id: 1, isVerified: true });
            await expect(service.register({ email: 'test@test.com', password: 'password' }))
                .rejects.toThrow(ConflictException);
        });

        it('should create a user and send OTP', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);
            mockPrismaService.role.findUnique.mockResolvedValue({ id: 1, name: 'USER' });
            mockPrismaService.user.create.mockResolvedValue({ id: 1, email: 'test@test.com' });

            const result = await service.register({ email: 'test@test.com', password: 'password' });

            expect(prisma.user.create).toHaveBeenCalled();
            expect(mockMailService.sendOtpEmail).toHaveBeenCalled();
            expect(result).toHaveProperty('message');
        });
    });

    describe('login', () => {
        it('should throw UnauthorizedException for invalid credentials', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);
            await expect(service.login({ email: 'test@test.com', password: 'wrong' }))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should return tokens for valid credentials', async () => {
            const hashedPassword = await bcrypt.hash('password', 10);
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 1,
                email: 'test@test.com',
                password: hashedPassword,
                isVerified: true,
            });

            const result = await service.login({ email: 'test@test.com', password: 'password' });

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });
    });
});
