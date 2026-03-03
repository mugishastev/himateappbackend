import {
    Controller, Get, Post, Body, Param, Delete, Patch,
    ParseIntPipe, Query, UseInterceptors, UploadedFile, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/message.dto';
import { PaginationDto } from '../utils/pagination.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messages')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Post()
    @UseInterceptors(FileInterceptor('media'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Send a message' })
    @ApiResponse({ status: 201, description: 'Message sent successfully' })
    create(
        @Body() createMessageDto: CreateMessageDto,
        @CurrentUser() user: any,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        createMessageDto.senderId = user.id;
        return this.messagesService.create(createMessageDto, file);
    }

    @Get('conversation/:id')
    @ApiOperation({ summary: 'Get messages for a conversation' })
    @ApiResponse({ status: 200, description: 'Return paginated messages' })
    findByConversation(
        @Param('id', ParseIntPipe) id: number,
        @Query() paginationDto: PaginationDto,
        @CurrentUser() user: any,
    ) {
        return this.messagesService.findByConversation(id, user.id, user.role, paginationDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single message by ID' })
    @ApiResponse({ status: 200, description: 'Return message details' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.messagesService.findOne(id);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark message as read' })
    @ApiResponse({ status: 200, description: 'Message marked as read' })
    markAsRead(@Param('id', ParseIntPipe) id: number) {
        return this.messagesService.markAsRead(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a message' })
    @ApiResponse({ status: 200, description: 'Message deleted (soft delete)' })
    remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: any,
    ) {
        return this.messagesService.remove(id, user.id, user.role);
    }
}
