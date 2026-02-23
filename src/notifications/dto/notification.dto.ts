import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateNotificationDto {
    @IsInt()
    userId: number;

    @IsString()
    type: string;

    @IsString()
    content: string;
}

export class UpdateNotificationDto {
    @IsOptional()
    @IsBoolean()
    isRead?: boolean;
}
