import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe, Query, Patch } from '@nestjs/common';
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
    getDiscoverPages(@Query('search') search?: string) {
        return this.pagesService.getDiscoverPages(search);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-pages')
    getMyPages(@CurrentUser() user: any) {
        return this.pagesService.getMyPages(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    updatePage(
        @CurrentUser() user: any,
        @Param('id', ParseIntPipe) pageId: number,
        @Body() dto: Partial<CreatePageDto>
    ) {
        return this.pagesService.updatePage(user.id, pageId, dto);
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



    @UseGuards(JwtAuthGuard)
    @Get(':id/analytics')
    getPageAnalytics(@CurrentUser() user: any, @Param('id', ParseIntPipe) pageId: number) {
        return this.pagesService.getPageAnalytics(user.id, pageId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/conversations')
    getPageConversations(@CurrentUser() user: any, @Param('id', ParseIntPipe) pageId: number) {
        return this.pagesService.getPageConversations(user.id, pageId);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/message')
    messagePage(@CurrentUser() user: any, @Param('id', ParseIntPipe) pageId: number) {
        return this.pagesService.messagePage(user.id, pageId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('posts/:id/react')
    reactToPost(
        @CurrentUser() user: any,
        @Param('id', ParseIntPipe) postId: number,
        @Body('type') type: string
    ) {
        return this.pagesService.toggleReaction(user.id, postId, type || 'LIKE');
    }

    @Post('posts/:id/view')
    trackPostView(@Param('id', ParseIntPipe) postId: number) {
        return this.pagesService.incrementPostViews(postId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('posts/:id/delete')
    deletePost(@CurrentUser() user: any, @Param('id', ParseIntPipe) postId: number) {
        return this.pagesService.deletePost(user.id, postId);
    }
}
