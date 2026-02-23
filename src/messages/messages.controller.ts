import { Controller, Get, Post, Body, Param, ParseIntPipe, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/message.dto';
import { PaginationDto } from '../utils/pagination.util';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('messages')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Post()
    @UseInterceptors(FileInterceptor('media'))
    create(
        @Body() createMessageDto: CreateMessageDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.messagesService.create(createMessageDto, file);
    }

    @Get('conversation/:id')
    findByConversation(
        @Param('id', ParseIntPipe) id: number,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.messagesService.findByConversation(id, paginationDto);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.messagesService.findOne(id);
    }
}
