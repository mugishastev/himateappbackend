import { IsEmail, IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'john_doe', required: false })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({ example: 'password123', required: false })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({ example: 'https://example.com/profile.jpg', required: false })
    @IsOptional()
    @IsString()
    profileImage?: string;

    @ApiProperty({ example: 'Passionate about tech and messaging apps', required: false })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @IsInt()
    roleId?: number;
}

export class UpdateUserDto {
    @ApiProperty({ example: 'user@example.com', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isVerified?: boolean;

    @ApiProperty({ example: 'john_doe_updated', required: false })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({ example: '+0987654321', required: false })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({ example: 'newpassword123', required: false })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({ example: 'https://example.com/new-profile.jpg', required: false })
    @IsOptional()
    @IsString()
    profileImage?: string;

    @ApiProperty({ example: 'Building secure chat products', required: false })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiProperty({ example: 2, required: false })
    @IsOptional()
    @IsInt()
    roleId?: number;

    // Preferences / Settings
    @ApiProperty({ example: 'Dark', required: false })
    @IsOptional()
    @IsString()
    theme?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    showLastSeen?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    showProfilePhoto?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    readReceipts?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    messageNotifs?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    soundEnabled?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    desktopNotifs?: boolean;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    twoStepEnabled?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    enterToSend?: boolean;

    @ApiProperty({ example: 'bg-[#0b141a]', required: false })
    @IsOptional()
    @IsString()
    chatWallpaper?: string;

    @ApiProperty({ example: 80, required: false })
    @IsOptional()
    @IsInt()
    wallpaperOpacity?: number;
}
