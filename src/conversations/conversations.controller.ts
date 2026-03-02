import {
    Controller, Get, Post, Body, Patch, Param, Delete,
    ParseIntPipe, Query, UseGuards
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto, UpdateConversationDto, AddParticipantDto } from './dto/conversation.dto';
import { PaginationDto } from '../utils/pagination.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    /**
     * POST /conversations
     * Create a new conversation (direct or group).
     * Body: { userIds: number[], title?: string, isGroup?: boolean }
     */
    @Post()
    create(@Body() createConversationDto: CreateConversationDto) {
        return this.conversationsService.create(createConversationDto);
    }

    /**
     * GET /conversations
     * Get all conversations (paginated).
     */
    @Get()
    findAll(@Query() paginationDto: PaginationDto) {
        return this.conversationsService.findAll(paginationDto);
    }

    /**
     * GET /conversations/user/:userId
     * Get all conversations that a specific user participates in.
     * NOTE: Must be declared before /:id to avoid route collision.
     */
    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.conversationsService.findByUser(userId, paginationDto);
    }

    /**
     * GET /conversations/:id
     * Get a single conversation with its participants and recent messages.
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.conversationsService.findOne(id);
    }

    /**
     * PATCH /conversations/:id
     * Update conversation title or group flag.
     */
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateConversationDto: UpdateConversationDto,
    ) {
        return this.conversationsService.update(id, updateConversationDto);
    }

    /**
     * POST /conversations/:id/participants
     * Add a user to an existing conversation.
     * Body: { userId: number }
     */
    @Post(':id/participants')
    addParticipant(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AddParticipantDto,
    ) {
        return this.conversationsService.addParticipant(id, dto.userId);
    }

    /**
     * DELETE /conversations/:id/participants/:userId
     * Remove a participant from a conversation.
     */
    @Delete(':id/participants/:userId')
    removeParticipant(
        @Param('id', ParseIntPipe) id: number,
        @Param('userId', ParseIntPipe) userId: number,
    ) {
        return this.conversationsService.removeParticipant(id, userId);
    }

    /**
     * DELETE /conversations/:id
     * Delete an entire conversation.
     */
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.conversationsService.remove(id);
    }
}
