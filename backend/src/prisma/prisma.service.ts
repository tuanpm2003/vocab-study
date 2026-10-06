import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { EnvironmentVariables } from '../config/env.validation.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
      // Phát sự kiện 'query' (không in ra console). Nhờ nó test đếm được số truy vấn
      // của một request để chứng minh không có N+1; khi debug: prisma.$on('query', ...).
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  /**
   * Không ném lỗi khi DB chưa sẵn sàng: app vẫn phải chạy được để /health
   * báo 503 rõ ràng, thay vì sập và chỉ để lại "connection refused".
   */
  async onModuleInit(): Promise<void> {
    if (await this.isDatabaseReachable()) {
      this.logger.log('Kết nối database: OK');
    } else {
      this.logger.warn(
        'Chưa kết nối được database — đã chạy `docker compose up -d` chưa? DATABASE_URL có đúng cổng 5434 không?',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
