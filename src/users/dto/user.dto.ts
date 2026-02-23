import { IsEmail, IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsString()
    profileImage?: string;

    @IsOptional()
    @IsInt()
    roleId?: number;
}

export class UpdateUserDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsBoolean()
    isVerified?: boolean;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsString()
    profileImage?: string;

    @IsOptional()
    @IsInt()
    roleId?: number;
}
