import {
    Controller, Get, Post, Body, Patch, Param, Delete,
    ParseIntPipe, Query, UseGuards, ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto, UpdateConversationDto, AddParticipantDto } from './dto/conversation.dto';
import { PaginationDto } from '../utils/pagination.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new conversation' })
    @ApiResponse({ status: 201, description: 'Conversation created successfully' })
    create(@Body() createConversationDto: CreateConversationDto, @CurrentUser() currentUser: any) {
        return this.conversationsService.create(createConversationDto, currentUser.id);
    }

    @Get()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Get all conversations (Admin only)' })
    @ApiResponse({ status: 200, description: 'Return all conversations' })
    findAll(@Query() paginationDto: PaginationDto) {
        return this.conversationsService.findAll(paginationDto);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get conversations for a specific user' })
    @ApiResponse({ status: 200, description: 'Return user conversations' })
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
        @CurrentUser() currentUser: any,
    ) {
        const currentRole = typeof currentUser.role === 'string' ? currentUser.role : currentUser.role?.name;
        if (currentRole !== 'ADMIN' && currentUser.id !== userId) {
            throw new ForbiddenException('You can only access your own conversations');
        }
        return this.conversationsService.findByUser(userId, currentUser.role, paginationDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single conversation by ID' })
    @ApiResponse({ status: 200, description: 'Return conversation details' })
    @ApiResponse({ status: 404, description: 'Conversation not found' })
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: any,
    ) {
        return this.conversationsService.findOne(id, user.id, user.role);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update conversation settings' })
    @ApiResponse({ status: 200, description: 'Conversation updated' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateConversationDto: UpdateConversationDto,
        @CurrentUser() currentUser: any,
    ) {
        return this.conversationsService.update(id, updateConversationDto, currentUser.id, currentUser.role);
    }

    @Post(':id/participants')
    @ApiOperation({ summary: 'Add a participant to the conversation' })
    @ApiResponse({ status: 201, description: 'Participant added' })
    addParticipant(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AddParticipantDto,
        @CurrentUser() currentUser: any,
    ) {
        return this.conversationsService.addParticipant(id, dto.userId, currentUser.id, currentUser.role);
    }

    @Delete(':id/participants/:userId')
    @ApiOperation({ summary: 'Remove a participant' })
    @ApiResponse({ status: 200, description: 'Participant removed' })
    removeParticipant(
        @Param('id', ParseIntPipe) id: number,
        @Param('userId', ParseIntPipe) userId: number,
        @CurrentUser() currentUser: any,
    ) {
        return this.conversationsService.removeParticipant(id, userId, currentUser.id, currentUser.role);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a conversation' })
    @ApiResponse({ status: 200, description: 'Conversation deleted' })
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
        return this.conversationsService.remove(id, currentUser.id, currentUser.role);
    }
}
