import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../utils/mail.service';

@Injectable()
export class AuthService {
    private otpMap = new Map<string, { otp: string; expiresAt: Date }>();

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private mailService: MailService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { email, password, username, phoneNumber } = registerDto;

        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username,
                phoneNumber,
                isVerified: false, // Explicitly set to false
            },
        });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in-memory
        this.otpMap.set(email, { otp, expiresAt });

        // Send OTP via email
        await this.mailService.sendOtpEmail(email, otp);

        return {
            message: 'Registration successful. Please check your email for the verification code.',
            userId: user.id,
            email: user.email,
        };
    }

    async verifyEmail(email: string, otp: string) {
        const storedData = this.otpMap.get(email);

        if (!storedData) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }

        if (storedData.otp !== otp) {
            throw new UnauthorizedException('Invalid OTP');
        }

        if (new Date() > storedData.expiresAt) {
            this.otpMap.delete(email);
            throw new UnauthorizedException('OTP has expired');
        }

        // Mark user as verified
        await this.prisma.user.update({
            where: { email },
            data: { isVerified: true },
        });

        // Remove OTP after successful verification
        this.otpMap.delete(email);

        const user = await this.prisma.user.findUnique({ where: { email } });
        return {
            message: 'Email verified successfully',
            ...(user ? await this.generateTokens(user.id, user.email) : {}),
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateTokens(user.id, user.email);
    }

    private async generateTokens(userId: number, email: string) {
        const payload = { sub: userId, email };

        return {
            accessToken: this.jwtService.sign(payload, {
                expiresIn: '15m',
            }),
            refreshToken: this.jwtService.sign(payload, {
                expiresIn: '7d',
            }),
            userId,
        };
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            return this.generateTokens(payload.sub, payload.email);
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async validateUser(userId: number) {
        return this.prisma.user.findUnique({ where: { id: userId } });
    }
}
