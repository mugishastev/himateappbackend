import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';
import { PaginationDto } from '../utils/pagination.util';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post()
    create(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationsService.create(createNotificationDto);
    }

    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.notificationsService.findByUser(userId, paginationDto);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateNotificationDto: UpdateNotificationDto) {
        return this.notificationsService.update(id, updateNotificationDto);
    }

    @Patch('user/:userId/read-all')
    markAllAsRead(@Param('userId', ParseIntPipe) userId: number) {
        return this.notificationsService.markAllAsRead(userId);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.notificationsService.remove(id);
    }
}
