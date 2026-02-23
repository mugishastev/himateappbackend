import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/contact.dto';
import { PaginationDto } from '../utils/pagination.util';

@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Post()
    create(@Body() createContactDto: CreateContactDto) {
        return this.contactsService.create(createContactDto);
    }

    @Get()
    findAll(@Query() paginationDto: PaginationDto) {
        return this.contactsService.findAll(paginationDto);
    }

    @Get('user/:userId')
    findByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.contactsService.findByUser(userId, paginationDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.contactsService.remove(id);
    }
}
