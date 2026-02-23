import { Controller, Get, Post, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/audit-log.dto';
import { PaginationDto } from '../utils/pagination.util';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) { }

    @Post()
    create(@Body() createAuditLogDto: CreateAuditLogDto) {
        return this.auditLogsService.create(createAuditLogDto);
    }

    @Get()
    findAll(@Query() paginationDto: PaginationDto) {
        return this.auditLogsService.findAll(paginationDto);
    }

    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.auditLogsService.findByUser(userId, paginationDto);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.auditLogsService.findOne(id);
    }
}
