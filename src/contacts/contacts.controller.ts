import {
    Controller, Get, Post, Body, Param, Delete,
    ParseIntPipe, Query, UseGuards
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/contact.dto';
import { PaginationDto } from '../utils/pagination.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    /**
     * POST /contacts
     * Add a new contact (owner–contact pair).
     * Body: { ownerId: number, contactId: number }
     */
    @Post()
    create(@Body() createContactDto: CreateContactDto) {
        return this.contactsService.create(createContactDto);
    }

    /**
     * GET /contacts
     * Get all contacts (paginated).
     */
    @Get()
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
    ) {
        return this.contactsService.findByUser(userId, paginationDto);
    }

    /**
     * GET /contacts/:id
     * Get a single contact record by its ID.
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.contactsService.findOne(id);
    }

    /**
     * DELETE /contacts/:id
     * Remove a contact record by its ID.
     */
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.contactsService.remove(id);
    }
}
