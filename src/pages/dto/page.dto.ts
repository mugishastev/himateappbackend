import { IsString, IsOptional, IsArray, IsUrl } from 'class-validator';

export class CreatePageDto {
    @IsString()
    name: string;

    @IsString()
    handle: string;

    @IsString()
    category: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    avatarUrl?: string;

    @IsString()
    @IsOptional()
    coverPhotoUrl?: string;
}

export class CreatePagePostDto {
    @IsString()
    content: string;

    @IsArray()
    @IsOptional()
    @IsUrl({}, { each: true })
    mediaUrls?: string[];
}

export class CreatePostCommentDto {
    @IsString()
    content: string;
}

