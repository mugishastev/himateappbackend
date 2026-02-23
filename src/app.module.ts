import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { StatusesModule } from './statuses/statuses.module';
import { CallsModule } from './calls/calls.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

import { UtilsModule } from './utils/utils.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UtilsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    StatusesModule,
    CallsModule,
    NotificationsModule,
    SettingsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
