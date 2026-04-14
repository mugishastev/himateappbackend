import { Controller, Get, Post, Query, UseGuards, Param, Body, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    @ApiOperation({ summary: 'Get platform-wide statistics' })
    getStats() {
        return this.adminService.getStats();
    }

    @Get('health')
    @ApiOperation({ summary: 'Get system health checks' })
    getHealth() {
        return this.adminService.getHealth();
    }

    @Get('users')
    @ApiOperation({ summary: 'Get all users (admin view)' })
    getAllUsers(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('search') search?: string,
        @Query('isBanned') isBanned?: string,
    ) {
        return this.adminService.getAllUsers(+page, +limit, search, isBanned === 'true');
    }

    @Get('conversations')
    @ApiOperation({ summary: 'Get all conversations (admin view)' })
    getAllConversations(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.adminService.getAllConversations(+page, +limit);
    }

    @Get('users/search')
    @ApiOperation({ summary: 'Search users (admin view)' })
    searchUsers(
        @Query('q') q: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.adminService.searchUsers(q, +page, +limit);
    }

    @Get('conversations/search')
    @ApiOperation({ summary: 'Search conversations by participant (admin view)' })
    searchConversations(
        @Query('q') q: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.adminService.searchConversations(q, +page, +limit);
    }

    @Get('messages')
    @ApiOperation({ summary: 'Get recent messages (admin view)' })
    getRecentMessages(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.adminService.getRecentMessages(+page, +limit);
    }

    @Post('users/:id/ban')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Ban a user' })
    banUser(
        @Param('id', ParseIntPipe) id: number,
        @Body('reason') reason: string,
    ) {
        return this.adminService.banUser(id, reason);
    }

    @Post('users/:id/unban')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Unban a user' })
    unbanUser(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.adminService.unbanUser(id);
    }

    @Get('audit-logs')
    @ApiOperation({ summary: 'Get admin audit logs' })
    getAuditLogs(
        @Query('page') page = '1',
        @Query('limit') limit = '30',
        @Query('action') action?: string,
    ) {
        return this.adminService.getAuditLogs(+page, +limit, action);
    }

    @Post('broadcast')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a broadcast notification to all users' })
    sendBroadcast(
        @Body('title') title: string,
        @Body('message') message: string,
    ) {
        return this.adminService.sendBroadcast(title, message);
    }

    @Get('broadcast/history')
    @ApiOperation({ summary: 'Get broadcast history' })
    getBroadcastHistory() {
        return this.adminService.getBroadcastHistory();
    }
}

