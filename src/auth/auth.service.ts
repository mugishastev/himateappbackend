import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../utils/mail.service';

@Injectable()
export class AuthService {
    private redisClient: Redis;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private mailService: MailService,
    ) {
        this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            connectTimeout: 15000,
            maxRetriesPerRequest: null,
            retryStrategy: (times) => Math.min(times * 100, 3000),
        });
        this.redisClient.on('error', (err) => console.error('[AuthService] Redis error:', err));
    }

    // ─── Register ────────────────────────────────────────────────────────────

    async register(registerDto: RegisterDto, ip?: string) {
        const { email, password, username, phoneNumber } = registerDto;

        // 1. IP Address Protection (Prevent multiple accounts from same network)
        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
            const previousRegistrations = await this.prisma.auditLog.findMany({
                where: {
                    action: 'ACCOUNT_CREATED',
                    ipAddress: ip,
                },
                include: {
                    user: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            // Find if there is an active verified user already created from this IP
            const activeUsers = previousRegistrations
                .map(log => log.user)
                .filter(u => u && u.isVerified && !u.isBanned);

            if (activeUsers.length >= 1) {
                const existingEmail = activeUsers[0].email;
                // Mask the email for privacy protection (e.g. j***e@domain.com)
                const parts = existingEmail.split('@');
                const maskedEmail = parts[0].length > 2
                    ? `${parts[0].slice(0, 2)}***${parts[0].slice(-1)}@${parts[1]}`
                    : `***@${parts[1]}`;

                throw new BadRequestException(
                    `To prevent abuse and protect platform security, Himate limits the number of accounts created from the same network. We detected an existing account (${maskedEmail}) associated with your connection. Please use the "Forgot Password" or recovery option to access your existing account instead of creating a new one.`
                );
            }
        }

        // 2. Email Verification Check
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        
        if (existingUser) {
            if (existingUser.isVerified) {
                throw new ConflictException(
                    `This email address (${email}) is already registered and verified on Himate. If this is your account, please recover it using the "Forgot Password" option to reset your password or backup your credentials.`
                );
            } else {
                // User started registration but didn't verify. Resend OTP.
                await this.sendOtp(email, 'VERIFY_EMAIL');
                return {
                    message: 'Already registered but not verified. A new verification code has been sent to your email.',
                    userId: existingUser.id,
                    email: existingUser.email,
                };
            }
        }

        // 3. Phone Number Verification Check
        if (phoneNumber) {
            const existingPhoneUser = await this.prisma.user.findFirst({
                where: {
                    phoneNumber,
                    isVerified: true,
                },
            });

            if (existingPhoneUser) {
                throw new ConflictException(
                    `This phone number is already linked to an active, verified account on Himate. To protect your data, we do not allow multiple accounts with the same number. Please use the "Forgot Password" page to recover the account associated with this phone number.`
                );
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let userRole = await this.prisma.role.findUnique({ where: { name: 'USER' } });
        if (!userRole) {
            userRole = await this.prisma.role.create({ data: { name: 'USER' } });
        }

        const user = await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username,
                phoneNumber,
                isVerified: false,
                roleId: userRole.id
            },
        });

        // Log audit
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'ACCOUNT_CREATED',
                category: 'session',
                details: `User ${user.email} registered account`,
                ipAddress: ip,
            }
        });

        // Generate + send verification OTP
        try {
            await this.sendOtp(email, 'VERIFY_EMAIL');
        } catch (error) {
            console.error('Registration OTP failed:', error);
            // We still return success since user is created, but with a warning.
            return {
                message: 'Registration successful, but we failed to send your verification email. Please use the "Resend OTP" option.',
                userId: user.id,
                email: user.email,
                warning: 'Email delivery failed'
            };
        }

        return {
            message: 'Registration successful. Please check your email for the verification code.',
            userId: user.id,
            email: user.email,
        };
    }

    // ─── Verify Email ─────────────────────────────────────────────────────────

    async verifyEmail(email: string, otp: string) {
        await this.validateOtp(email, otp, 'VERIFY_EMAIL');

        await this.prisma.user.update({ where: { email }, data: { isVerified: true } });

        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, username: true, profileImage: true, bio: true, role: true }
        });
        const tokens = await this.generateTokens(user!.id, user!.email);

        return {
            message: 'Email verified successfully.',
            user: {
                ...user,
                isAdmin: user?.role?.name === 'ADMIN'
            },
            ...tokens,
        };
    }

    // ─── Resend OTP ───────────────────────────────────────────────────────────

    async resendOtp(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new NotFoundException('User not found');
        if (user.isVerified) throw new BadRequestException('Email is already verified');

        await this.sendOtp(email, 'VERIFY_EMAIL');
        return { message: 'Verification code resent. Please check your email.' };
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    async login(loginDto: LoginDto, ip?: string) {
        const { email, password } = loginDto;
        console.log(`[LOGIN-DEBUG] Attempting login for: ${email}`);

        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { role: true }
        });
        console.log(`[LOGIN-DEBUG] User found:`, user ? { id: user.id, email: user.email, hasPassword: !!user.password, isVerified: user.isVerified, roleId: user.roleId } : 'No user found');

        if (!user || !user.password) {
            await this.prisma.auditLog.create({
                data: {
                    action: 'LOGIN_FAILED',
                    category: 'high-risk',
                    details: `Failed login attempt for non-existent email: ${email}`,
                    ipAddress: ip,
                }
            });
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(`[LOGIN-DEBUG] Password valid: ${isPasswordValid}`);

        if (!isPasswordValid) {
            await this.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'LOGIN_FAILED',
                    category: 'high-risk',
                    details: `Failed login attempt (invalid password) for user: ${email}`,
                    ipAddress: ip,
                }
            });
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isVerified) {
            console.log(`[LOGIN-DEBUG] User not verified!`);
            await this.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'LOGIN_FAILED',
                    category: 'high-risk',
                    details: `Attempted login on unverified account for user: ${email}`,
                    ipAddress: ip,
                }
            });
            throw new UnauthorizedException('Please verify your email before logging in');
        }

        if (user.isBanned) {
            console.log(`[LOGIN-DEBUG] User is banned!`);
            await this.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'LOGIN_FAILED',
                    category: 'high-risk',
                    details: `Attempted login on suspended account for user: ${email}. Reason: ${user.banReason}`,
                    ipAddress: ip,
                }
            });
            throw new ForbiddenException(user.banReason || 'You have been suspended from the platform.');
        }

        // Log audit and update lastSeen
        await Promise.all([
            this.prisma.auditLog.create({
                data: { 
                    userId: user.id, 
                    action: 'LOGIN', 
                    category: 'session',
                    details: `User ${user.email} logged in`,
                    ipAddress: ip,
                },
            }),
            this.prisma.user.update({
                where: { id: user.id },
                data: { lastSeen: new Date() },
            }),
        ]);

        const tokens = await this.generateTokens(user.id, user.email);
        const { password: _, ...userWithoutPassword } = user;

        return {
            ...tokens,
            user: {
                ...userWithoutPassword,
                isAdmin: user.role?.name === 'ADMIN'
            },
        };
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    async logout(userId: number, ip?: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Log audit
        await this.prisma.auditLog.create({
            data: { 
                userId, 
                action: 'LOGOUT', 
                category: 'session',
                details: `User ${user.email} logged out`,
                ipAddress: ip,
            },
        });

        return { message: 'Logged out successfully.' };
    }

    // ─── Refresh Token ────────────────────────────────────────────────────────

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            return this.generateTokens(payload.sub, payload.email);
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    // ─── Forgot Password ──────────────────────────────────────────────────────

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) throw new NotFoundException('No account found with that email');

        await this.sendOtp(dto.email, 'RESET_PASSWORD');
        return { message: 'Password reset code sent. Please check your email.' };
    }

    // ─── Reset Password ───────────────────────────────────────────────────────

    async resetPassword(dto: ResetPasswordDto, ip?: string) {
        await this.validateOtp(dto.email, dto.otp, 'RESET_PASSWORD');

        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { email: dto.email },
            data: { password: hashedPassword },
        });

        // Log audit
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (user) {
            await this.prisma.auditLog.create({
                data: { 
                    userId: user.id, 
                    action: 'RESET_PASSWORD', 
                    category: 'session',
                    details: `Password reset for ${dto.email}`,
                    ipAddress: ip,
                },
            });
        }

        return { message: 'Password reset successfully. You can now log in with your new password.' };
    }

    // ─── Profile ──────────────────────────────────────────────────────────────

    async getProfile(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                phoneNumber: true,
                profileImage: true,
                bio: true,
                lastSeen: true,
                isVerified: true,
                createdAt: true,
            }
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    // ─── Validate User (used by JWT Strategy) ────────────────────────────────

    async validateUser(userId: number) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private async generateTokens(userId: number, email: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        const payload = {
            sub: userId,
            email,
            role: user?.role?.name || 'USER'
        };

        return {
            accessToken: this.jwtService.sign(payload, { expiresIn: '2h' }),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
            userId,
            role: payload.role,
        };
    }

    private async sendOtp(email: string, purpose: string) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const key = `otp:${email}:${purpose}`;
        
        await this.redisClient.set(key, JSON.stringify({ otp, expiresAt }), 'EX', 600);
        await this.mailService.sendOtpEmail(email, otp);
    }

    private async validateOtp(email: string, otp: string, purpose: string) {
        const key = `otp:${email}:${purpose}`;
        const storedJson = await this.redisClient.get(key);

        if (!storedJson) throw new UnauthorizedException('Invalid or expired OTP');
        
        const stored = JSON.parse(storedJson);
        if (stored.otp !== otp) throw new UnauthorizedException('Invalid OTP');
        if (new Date() > new Date(stored.expiresAt)) {
            await this.redisClient.del(key);
            throw new UnauthorizedException('OTP has expired');
        }

        await this.redisClient.del(key);
    }
}
