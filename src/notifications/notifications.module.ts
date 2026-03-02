import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

import { ChatModule } from '../chat/chat.module';

import { FcmService } from './fcm.service';

@Module({
    imports: [ChatModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, FcmService],
    exports: [NotificationsService, FcmService],
})
export class NotificationsModule { }
