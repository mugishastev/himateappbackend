import { IsString, IsOptional } from 'class-validator';

export class CreateRoleDto {
    @IsString()
    name: string;
}

export class UpdateRoleDto {
    @IsOptional()
    @IsString()
    name?: string;
}
