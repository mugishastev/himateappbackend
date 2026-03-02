import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
    @ApiProperty({ example: 'Hello world!', description: 'Message content', required: false })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ example: 1, description: 'ID of the sender' })
    @IsInt()
    senderId: number;

    @ApiProperty({ example: 5, description: 'ID of the conversation' })
    @IsInt()
    conversationId: number;

    @ApiProperty({ type: 'string', format: 'binary', description: 'Optional media file', required: false })
    @IsOptional()
    media?: any;
}
