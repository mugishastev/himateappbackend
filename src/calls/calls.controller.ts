import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CreateCallDto, UpdateCallDto } from './dto/call.dto';
import { PaginationDto } from '../utils/pagination.util';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
    constructor(private readonly callsService: CallsService) { }

    @Post()
    create(@Body() createCallDto: CreateCallDto) {
        return this.callsService.create(createCallDto);
    }

    @Get()
    findAll(@Query() paginationDto: PaginationDto) {
        return this.callsService.findAll(paginationDto);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.callsService.findOne(id);
    }

    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.callsService.findByUser(userId, paginationDto);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateCallDto: UpdateCallDto) {
        return this.callsService.update(id, updateCallDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.callsService.remove(id);
    }
}
