import {
    Controller, Get, Post, Body, HttpCode, HttpStatus,
    Patch, UseGuards, Request, ParseIntPipe, Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ResendOtpDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // ─── Public Routes ────────────────────────────────────────────────────────

    /**
     * POST /auth/register
     * Register a new user account. Sends a 6-digit OTP to the provided email.
     */
    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    @ApiResponse({ status: 409, description: 'Email already exists' })
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
    @ApiOperation({ summary: 'Verify email with OTP' })
    @ApiResponse({ status: 200, description: 'Email verified and tokens returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
    @ApiBody({ schema: { properties: { email: { type: 'string' }, otp: { type: 'string' } } } })
    verifyEmail(@Body('email') email: string, @Body('otp') otp: string) {
        return this.authService.verifyEmail(email, otp);
    }

    /**
     * POST /auth/resend-otp
     * Resend a new OTP to the user's email (e.g. if the previous one expired).
     */
    @Post('resend-otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend verification OTP' })
    @ApiResponse({ status: 200, description: 'New OTP sent to email' })
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
    @ApiOperation({ summary: 'User login' })
    @ApiResponse({ status: 200, description: 'Login successful, tokens returned' })
    @ApiResponse({ status: 401, description: 'Invalid credentials or unverified email' })
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    /**
     * POST /auth/refresh
     * Exchange a valid refresh token for a new access & refresh token pair.
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'New tokens returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
    refresh(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
    }

    /**
     * POST /auth/forgot-password
     * Send an OTP to the user's email for password reset.
     */
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset OTP' })
    @ApiResponse({ status: 200, description: 'Reset OTP sent to email' })
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    /**
     * POST /auth/reset-password
     * Reset password after verifying the OTP from forgot-password flow.
     */
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with OTP' })
    @ApiResponse({ status: 200, description: 'Password reset successful' })
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    getProfile(@CurrentUser() user: any) {
        return this.authService.getProfile(user.id);
    }

    /**
     * POST /auth/logout  (requires Bearer token)
     * Records a logout audit log for the authenticated user.
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log out user' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    logout(@CurrentUser() user: any) {
        return this.authService.logout(user.id);
    }
}
