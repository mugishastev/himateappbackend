import { IsString, IsOptional, IsBoolean, IsArray, IsInt } from 'class-validator';

export class CreateConversationDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsBoolean()
    isGroup?: boolean;

    @IsArray()
    @IsInt({ each: true })
    userIds: number[];
}

export class UpdateConversationDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsBoolean()
    isGroup?: boolean;
}
