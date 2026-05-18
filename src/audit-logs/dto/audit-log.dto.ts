import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateAuditLogDto {
    @IsOptional()
    @IsInt()
    userId?: number;

    @IsOptional()
    @IsInt()
    targetId?: number;

    @IsString()
    action: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    details?: string;

    @IsOptional()
    @IsString()
    ipAddress?: string;
}
