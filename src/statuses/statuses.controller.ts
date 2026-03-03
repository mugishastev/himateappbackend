import {
    Controller, Get, Post, Body, Patch, Param, Delete,
    ParseIntPipe, Query, UseInterceptors, UploadedFile, UseGuards
} from '@nestjs/common';
import { StatusesService } from './statuses.service';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto';
import { PaginationDto } from '../utils/pagination.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('statuses')
export class StatusesController {
    constructor(private readonly statusesService: StatusesService) { }

    /**
     * POST /statuses
     * Create a new status (supports optional media upload via multipart/form-data).
     */
    @Post()
    @UseInterceptors(FileInterceptor('media'))
    create(
        @Body() createStatusDto: CreateStatusDto,
        @CurrentUser() user: any,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        createStatusDto.userId = user.id;
        return this.statusesService.create(createStatusDto, file);
    }

    /**
     * GET /statuses
     * Get all statuses (paginated), newest first.
     */
    @Get()
    findAll(@Query() paginationDto: PaginationDto) {
        return this.statusesService.findAll(paginationDto);
    }

    /**
     * GET /statuses/user/:userId
     * Get all statuses posted by a specific user.
     * NOTE: Declared before /:id to prevent NestJS from matching 'user' as an id param.
     */
    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.statusesService.findByUser(userId, paginationDto);
    }

    /**
     * GET /statuses/:id
     * Get a single status by its ID.
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.statusesService.findOne(id);
    }

    /**
     * PATCH /statuses/:id
     * Update a status's content or media URL.
     */
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateStatusDto: UpdateStatusDto,
        @CurrentUser() user: any,
    ) {
        return this.statusesService.update(id, updateStatusDto, user.id, user.role);
    }

    /**
     * DELETE /statuses/:id
     * Delete a status by its ID.
     */
    @Delete(':id')
    remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: any,
    ) {
        return this.statusesService.remove(id, user.id, user.role);
    }
}
