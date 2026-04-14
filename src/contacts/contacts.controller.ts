import {
    Controller, Get, Post, Body, Param, Delete,
    ParseIntPipe, Query, UseGuards, ForbiddenException
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/contact.dto';
import { PaginationDto } from '../utils/pagination.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

function isAdmin(user: any) {
    return user?.role?.name === 'ADMIN' || user?.role === 'ADMIN';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    /**
     * POST /contacts
     * Add a new contact (owner–contact pair).
     * Body: { ownerId: number, contactId: number }
     */
    @Post()
    create(@Body() createContactDto: CreateContactDto, @CurrentUser() currentUser: any) {
        createContactDto.ownerId = currentUser.id;
        return this.contactsService.create(createContactDto);
    }

    /**
     * GET /contacts
     * Get all contacts (paginated).
     */
    @Get()
    @Roles('ADMIN')
    findAll(@Query() paginationDto: PaginationDto) {
        return this.contactsService.findAll(paginationDto);
    }

    /**
     * GET /contacts/user/:userId
     * Get all contacts belonging to a specific user.
     * NOTE: Must be declared before /:id to avoid route collision.
     */
    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
        @CurrentUser() currentUser: any,
    ) {
        if (!isAdmin(currentUser) && currentUser.id !== userId) {
            throw new ForbiddenException('You can only access your own contacts');
        }
        return this.contactsService.findByUser(userId, paginationDto);
    }

    /**
     * GET /contacts/:id
     * Get a single contact record by its ID.
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
        return this.contactsService.findOne(id, currentUser.id, isAdmin(currentUser));
    }

    /**
     * DELETE /contacts/:id
     * Remove a contact record by its ID.
     */
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
        return this.contactsService.remove(id, currentUser.id, isAdmin(currentUser));
    }
}
