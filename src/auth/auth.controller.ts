import {
    Controller, Get, Post, Body, HttpCode, HttpStatus,
    Patch, UseGuards, Request
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ResendOtpDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // ─── Public Routes ────────────────────────────────────────────────────────

    /**
     * POST /auth/register
     * Register a new user account. Sends a 6-digit OTP to the provided email.
     */
    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    /**
     * POST /auth/verify-email
     * Verify email with the OTP received after registration.
     * Returns access & refresh tokens on success.
     */
    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    verifyEmail(@Body('email') email: string, @Body('otp') otp: string) {
        return this.authService.verifyEmail(email, otp);
    }

    /**
     * POST /auth/resend-otp
     * Resend a new OTP to the user's email (e.g. if the previous one expired).
     */
    @Post('resend-otp')
    @HttpCode(HttpStatus.OK)
    resendOtp(@Body() dto: ResendOtpDto) {
        return this.authService.resendOtp(dto.email);
    }

    /**
     * POST /auth/login
     * Authenticate with email + password.
     * Returns access & refresh tokens.
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    /**
     * POST /auth/refresh
     * Exchange a valid refresh token for a new access & refresh token pair.
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    refresh(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
    }

    /**
     * POST /auth/forgot-password
     * Send an OTP to the user's email for password reset.
     */
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    /**
     * POST /auth/reset-password
     * Reset password after verifying the OTP from forgot-password flow.
     */
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    // ─── Protected Routes ─────────────────────────────────────────────────────

    /**
     * GET /auth/profile (requires Bearer token)
     * Returns the current authenticated user's profile.
     */
    @Get('profile')
    @UseGuards(JwtAuthGuard)
    getProfile(@CurrentUser() user: any) {
        return this.authService.getProfile(user.id);
    }

    /**
     * POST /auth/logout  (requires Bearer token)
     * Records a logout audit log for the authenticated user.
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    logout(@CurrentUser() user: any) {
        return this.authService.logout(user.id);
    }
}
