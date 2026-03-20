import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationDto } from '../utils/pagination.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new user (Admin only)' })
    @ApiResponse({ status: 201, description: 'User created' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Return all users' })
    findAll(@Query() paginationDto: PaginationDto) {
        return this.usersService.findAll(paginationDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'Return user details' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update user details' })
    @ApiResponse({ status: 200, description: 'User updated' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Patch(':id/profile-image')
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update user profile image' })
    @ApiResponse({ status: 200, description: 'Image updated' })
    @ApiBody({ schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } })
    async uploadProfileImage(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.usersService.updateProfileImage(id, file);
    }

    @Patch(':id/fcm-token')
    @ApiOperation({ summary: 'Update FCM token' })
    @ApiResponse({ status: 200, description: 'FCM token updated' })
    @ApiBody({ schema: { properties: { fcmToken: { type: 'string' } } } })
    async updateFcmToken(
        @Param('id', ParseIntPipe) id: number,
        @Body('fcmToken') fcmToken: string,
    ) {
        return this.usersService.updateFcmToken(id, fcmToken);
    }

    @Patch(':id/change-password')
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200, description: 'Password changed' })
    @ApiBody({ schema: { properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } } } })
    changePassword(
        @Param('id', ParseIntPipe) id: number,
        @Body('currentPassword') currentPassword: string,
        @Body('newPassword') newPassword: string,
    ) {
        return this.usersService.changePassword(id, currentPassword, newPassword);
    }

    @Post(':id/block')
    @ApiOperation({ summary: 'Block a user' })
    @ApiResponse({ status: 200, description: 'User blocked' })
    blockUser(
        @CurrentUser() currentUser: any,
        @Param('id', ParseIntPipe) targetId: number,
    ) {
        return this.usersService.blockUser(currentUser.id, targetId);
    }

    @Delete(':id/block')
    @ApiOperation({ summary: 'Unblock a user' })
    @ApiResponse({ status: 200, description: 'User unblocked' })
    unblockUser(
        @CurrentUser() currentUser: any,
        @Param('id', ParseIntPipe) targetId: number,
    ) {
        return this.usersService.unblockUser(currentUser.id, targetId);
    }

    @Get('me/blocked')
    @ApiOperation({ summary: 'Get blocked users list' })
    @ApiResponse({ status: 200, description: 'List of blocked users' })
    getBlockedUsers(@CurrentUser() currentUser: any) {
        return this.usersService.getBlockedUsers(currentUser.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete user' })
    @ApiResponse({ status: 200, description: 'User deleted' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.remove(id);
    }
}
