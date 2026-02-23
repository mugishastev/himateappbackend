import { IsInt, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum CallType {
    AUDIO = 'AUDIO',
    VIDEO = 'VIDEO',
}

export class CreateCallDto {
    @IsInt()
    callerId: number;

    @IsInt()
    receiverId: number;

    @IsDateString()
    startedAt: string;

    @IsEnum(CallType)
    type: CallType;
}

export class UpdateCallDto {
    @IsOptional()
    @IsDateString()
    endedAt?: string;
}
