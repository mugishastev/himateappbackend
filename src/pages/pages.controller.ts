import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PagesService } from './pages.service';
import { CreatePageDto, CreatePagePostDto } from './dto/page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pages')
export class PagesController {
    constructor(private readonly pagesService: PagesService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    createPage(@CurrentUser() user: any, @Body() createPageDto: CreatePageDto) {
        return this.pagesService.createPage(user.id, createPageDto);
    }

    @Get('discover')
    getDiscoverPages() {
        return this.pagesService.getDiscoverPages();
    }

    @Get(':handle')
    getPageByHandle(@Param('handle') handle: string) {
        return this.pagesService.getPageByHandle(handle);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/follow')
    followPage(@CurrentUser() user: any, @Param('id', ParseIntPipe) pageId: number) {
        return this.pagesService.followPage(user.id, pageId);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/posts')
    createPost(
        @CurrentUser() user: any,
        @Param('id', ParseIntPipe) pageId: number,
        @Body() createPagePostDto: CreatePagePostDto,
    ) {
        return this.pagesService.createPost(user.id, pageId, createPagePostDto);
    }
}
