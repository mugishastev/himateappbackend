import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreatePermissionDto {
    @IsString()
    action: string;

    @IsInt()
    roleId: number;
}

export class UpdatePermissionDto {
    @IsOptional()
    @IsString()
    action?: string;

    @IsOptional()
    @IsInt()
    roleId?: number;
}
