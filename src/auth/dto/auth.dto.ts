import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    phoneNumber?: string;
}

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}

export class ForgotPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class ResetPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    otp: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}

export class ResendOtpDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
