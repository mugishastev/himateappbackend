import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'The email address of the user' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123', description: 'The password of the user (min 6 characters)' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'john_doe', description: 'Optional username', required: false })
    @IsString()
    @IsOptional()
    username?: string;

    @ApiProperty({ example: '+1234567890', description: 'Optional phone number', required: false })
    @IsString()
    @IsOptional()
    phoneNumber?: string;
}

export class LoginDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: '123456', description: 'The 6-digit OTP received via email' })
    @IsString()
    @IsNotEmpty()
    otp: string;

    @ApiProperty({ example: 'newpassword123', description: 'The new password' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}

export class ResendOtpDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
