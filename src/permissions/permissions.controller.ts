import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { PaginationDto } from '../utils/pagination.util';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.permissionsService.findAll(paginationDto);
  }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.permissionsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updatePermissionDto: UpdatePermissionDto) {
        return this.permissionsService.update(id, updatePermissionDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.permissionsService.remove(id);
    }
}
