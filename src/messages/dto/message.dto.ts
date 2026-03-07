import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMessageDto {
    @ApiProperty({ example: 'Hello world!', description: 'Message content', required: false })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ example: 1, description: 'ID of the sender' })
    @Type(() => Number)
    @IsInt()
    senderId: number;

    @ApiProperty({ example: 5, description: 'ID of the conversation' })
    @Type(() => Number)
    @IsInt()
    conversationId: number;

    @ApiProperty({ example: 'IMAGE', description: 'Message type', required: false })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiProperty({ type: 'string', format: 'binary', description: 'Optional media file', required: false })
    @IsOptional()
    media?: any;
}
