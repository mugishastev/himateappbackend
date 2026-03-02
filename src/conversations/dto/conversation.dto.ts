import { IsString, IsOptional, IsBoolean, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
    @ApiProperty({ example: 'Group Chat', description: 'The title of the conversation', required: false })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ example: true, description: 'Whether this is a group conversation', required: false })
    @IsOptional()
    @IsBoolean()
    isGroup?: boolean;

    @ApiProperty({ example: [1, 2, 3], description: 'List of user IDs to include in the conversation' })
    @IsArray()
    @IsInt({ each: true })
    userIds: number[];
}

export class UpdateConversationDto {
    @ApiProperty({ example: 'Updated Title', required: false })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    isGroup?: boolean;
}

export class AddParticipantDto {
    @ApiProperty({ example: 4 })
    @IsInt()
    userId: number;
}
