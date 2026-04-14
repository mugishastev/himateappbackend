import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';
import { PaginationDto } from '../utils/pagination.util';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

function isAdmin(user: any) {
    return user?.role?.name === 'ADMIN' || user?.role === 'ADMIN';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post()
    @Roles('ADMIN')
    create(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationsService.create(createNotificationDto);
    }

    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
        @CurrentUser() currentUser: any,
    ) {
        if (!isAdmin(currentUser) && currentUser.id !== userId) {
            throw new ForbiddenException('You can only access your own notifications');
        }
        return this.notificationsService.findByUser(userId, paginationDto);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateNotificationDto: UpdateNotificationDto, @CurrentUser() currentUser: any) {
        return this.notificationsService.update(id, updateNotificationDto, currentUser.id, isAdmin(currentUser));
    }

    @Patch('user/:userId/read-all')
    markAllAsRead(@Param('userId', ParseIntPipe) userId: number, @CurrentUser() currentUser: any) {
        if (!isAdmin(currentUser) && currentUser.id !== userId) {
            throw new ForbiddenException('You can only mark your own notifications as read');
        }
        return this.notificationsService.markAllAsRead(userId);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
        return this.notificationsService.remove(id, currentUser.id, isAdmin(currentUser));
    }
}
