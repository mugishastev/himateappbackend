import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20));
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
