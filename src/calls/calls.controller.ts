import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CreateCallDto, UpdateCallDto, ScheduleCallDto } from './dto/call.dto';
import { PaginationDto } from '../utils/pagination.util';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

function isAdmin(user: any) {
    return user?.role?.name === 'ADMIN' || user?.role === 'ADMIN';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calls')
export class CallsController {
    constructor(private readonly callsService: CallsService) { }

    @Post()
    create(@Body() createCallDto: CreateCallDto, @CurrentUser() currentUser: any) {
        createCallDto.callerId = currentUser.id;
        return this.callsService.create(createCallDto);
    }

    @Post('schedule')
    schedule(@Body() scheduleCallDto: ScheduleCallDto, @CurrentUser() currentUser: any) {
        scheduleCallDto.callerId = currentUser.id;
        return this.callsService.scheduleCall(scheduleCallDto);
    }

    @Get()
    @Roles('ADMIN')
    findAll(@Query() paginationDto: PaginationDto) {
        return this.callsService.findAll(paginationDto);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
        return this.callsService.findOne(id, currentUser.id, isAdmin(currentUser));
    }

    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
        @CurrentUser() currentUser: any,
    ) {
        if (!isAdmin(currentUser) && currentUser.id !== userId) {
            throw new ForbiddenException('You can only access your own calls');
        }
        return this.callsService.findByUser(userId, paginationDto);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateCallDto: UpdateCallDto, @CurrentUser() currentUser: any) {
        return this.callsService.update(id, updateCallDto, currentUser.id, isAdmin(currentUser));
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
        return this.callsService.remove(id, currentUser.id, isAdmin(currentUser));
    }
}
