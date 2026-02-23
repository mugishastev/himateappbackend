import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { StatusesService } from './statuses.service';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto';
import { PaginationDto } from '../utils/pagination.util';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('statuses')
export class StatusesController {
    constructor(private readonly statusesService: StatusesService) { }

    @Post()
    @UseInterceptors(FileInterceptor('media'))
    create(
        @Body() createStatusDto: CreateStatusDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.statusesService.create(createStatusDto, file);
    }

    @Get()
    findAll(@Query() paginationDto: PaginationDto) {
        return this.statusesService.findAll(paginationDto);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.statusesService.findOne(id);
    }

    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.statusesService.findByUser(userId, paginationDto);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateStatusDto: UpdateStatusDto) {
        return this.statusesService.update(id, updateStatusDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.statusesService.remove(id);
    }
}
