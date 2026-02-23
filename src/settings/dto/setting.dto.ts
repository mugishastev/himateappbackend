import { IsString, IsInt } from 'class-validator';

export class CreateSettingDto {
    @IsInt()
    userId: number;

    @IsString()
    key: string;

    @IsString()
    value: string;
}

export class UpdateSettingDto {
    @IsString()
    value: string;
}
