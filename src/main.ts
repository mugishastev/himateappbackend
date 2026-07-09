import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import helmet from 'helmet';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<boolean> {
    if (!process.env.REDIS_URL) {
      return false;
    }
    const redisOptions = {
      connectTimeout: 3000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    };
    
    try {
      const testClient = new Redis(process.env.REDIS_URL, redisOptions);
      testClient.on('error', () => {}); // Catch test client errors quietly
      
      const pingResult = await testClient.ping();
      await testClient.quit();
      
      if (pingResult === 'PONG') {
        const pubClient = new Redis(process.env.REDIS_URL, {
          ...redisOptions,
          enableOfflineQueue: true,
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) => Math.min(times * 100, 3000),
        });
        const subClient = pubClient.duplicate();

        pubClient.on('error', (err) => console.error('Redis PubClient Error:', err.message));
        subClient.on('error', (err) => console.error('Redis SubClient Error:', err.message));

        this.adapterConstructor = createAdapter(pubClient, subClient);
        return true;
      }
    } catch (err: any) {
      console.warn('[RedisIoAdapter] Redis connection test failed. Falling back to default in-memory adapter.', err.message);
    }
    return false;
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api', { exclude: ['/'] });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Himate API')
    .setDescription('The Himate Chat Application API documentation')
    .setVersion('1.0')
    .addServer('http://localhost:5000', 'Local Environment')
    .addServer('https://himateappbackend.vercel.app', 'Production Environment')
    .addServer(process.env.APP_URL || 'http://localhost:5000', 'Current Environment')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
    ],
  });

  // Security
  app.use(helmet());
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://himateappbackend.vercel.app',
      /\.vercel\.app$/, // Allow all vercel preview branches
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Hooks
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: true,
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // WebSocket Adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  const isRedisConnected = await redisIoAdapter.connectToRedis();
  if (isRedisConnected) {
    app.useWebSocketAdapter(redisIoAdapter);
    console.log('Using Redis WebSocket Adapter for multi-instance sync.');
  } else {
    console.log('Using default in-memory WebSocket Adapter.');
  }

  await app.listen(process.env.PORT ?? 5000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
