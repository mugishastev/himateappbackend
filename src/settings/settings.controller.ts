import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';
import { PaginationDto } from '../utils/pagination.util';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

function isAdmin(user: any) {
    return user?.role?.name === 'ADMIN' || user?.role === 'ADMIN';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Post()
    create(@CurrentUser() user: any, @Body() createSettingDto: CreateSettingDto) {
        return this.settingsService.create(user.id, createSettingDto);
    }

    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
        @CurrentUser() currentUser: any,
    ) {
        if (!isAdmin(currentUser) && currentUser.id !== userId) {
            throw new ForbiddenException('You can only access your own settings');
        }
        return this.settingsService.findByUser(userId, paginationDto);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
        return this.settingsService.findOne(id, currentUser.id, isAdmin(currentUser));
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateSettingDto: UpdateSettingDto, @CurrentUser() currentUser: any) {
        return this.settingsService.update(id, updateSettingDto, currentUser.id, isAdmin(currentUser));
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
        return this.settingsService.remove(id, currentUser.id, isAdmin(currentUser));
    }
}
