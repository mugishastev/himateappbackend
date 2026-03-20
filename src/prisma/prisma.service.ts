import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const databaseUrl = config.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      // Keep connections alive — prevents EAI_AGAIN on idle Neon endpoints
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      max: 10,
    });

    pool.on('error', (err) => {
      console.error('[pg Pool] Unexpected error on idle client:', err.message);
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully.');
        return;
      } catch (err: any) {
        this.logger.warn(
          `DB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`,
        );
        if (attempt === maxRetries) {
          this.logger.error('Could not connect to the database after all retries.');
          throw err;
        }
        // Exponential back-off: 2s, 4s, 8s, 16s ...
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}