import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateStatusDto {
    @IsInt()
    userId: number;

    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    mediaUrl?: string;

    @IsDateString()
    expiresAt: string;
}

export class UpdateStatusDto {
    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsString()
    mediaUrl?: string;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}
