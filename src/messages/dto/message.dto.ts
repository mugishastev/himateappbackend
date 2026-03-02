import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateMessageDto {
    @IsString()
    @IsOptional()
    content?: string;

    @IsInt()
    senderId: number;

    @IsInt()
    conversationId: number;
}
