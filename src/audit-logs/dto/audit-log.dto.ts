import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateAuditLogDto {
    @IsOptional()
    @IsInt()
    userId?: number;

    @IsString()
    action: string;

    @IsOptional()
    @IsString()
    details?: string;
}
