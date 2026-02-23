import { Global, Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.config';
import { CloudinaryService } from './cloudinary.service';
import { MailService } from './mail.service';

@Global()
@Module({
    providers: [CloudinaryProvider, CloudinaryService, MailService],
    exports: [CloudinaryProvider, CloudinaryService, MailService],
})
export class UtilsModule { }
