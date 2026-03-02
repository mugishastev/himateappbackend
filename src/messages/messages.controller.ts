import {
    Controller, Get, Post, Body, Param, Delete, Patch,
    ParseIntPipe, Query, UseInterceptors, UploadedFile, UseGuards
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/message.dto';
import { PaginationDto } from '../utils/pagination.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messages')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    /**
     * POST /messages
     * Send a message (supports optional media file upload via multipart/form-data).
     */
    @Post()
    @UseInterceptors(FileInterceptor('media'))
    create(
        @Body() createMessageDto: CreateMessageDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.messagesService.create(createMessageDto, file);
    }

    /**
     * GET /messages/conversation/:id
     * Retrieve paginated messages for a specific conversation.
     */
    @Get('conversation/:id')
    findByConversation(
        @Param('id', ParseIntPipe) id: number,
        @Query() paginationDto: PaginationDto,
        @CurrentUser() user: any,
    ) {
        return this.messagesService.findByConversation(id, user.id, user.role, paginationDto);
    }

    /**
     * GET /messages/:id
     * Get a single message by its ID.
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.messagesService.findOne(id);
    }

    /**
     * PATCH /messages/:id/read
     * Mark a message as read (and delivered). Triggers a real-time read receipt via WebSocket.
     */
    @Patch(':id/read')
    markAsRead(@Param('id', ParseIntPipe) id: number) {
        return this.messagesService.markAsRead(id);
    }

    /**
     * DELETE /messages/:id
     * Delete a message by its ID.
     */
    @Delete(':id')
    remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: any,
    ) {
        return this.messagesService.remove(id, user.id, user.role);
    }
}
