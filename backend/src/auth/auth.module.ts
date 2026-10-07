import { randomBytes } from 'node:crypto';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SESSION_TTL_SECONDS } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/**
 * Production bắt buộc có JWT_SECRET (validateEnv đã chặn từ lúc khởi động).
 * Ở máy local, thiếu thì sinh một khóa NGẪU NHIÊN cho lần chạy này thay vì dùng một khóa
 * viết sẵn trong code: app vẫn chạy ngay, không có secret nào nằm trong repo. Cái giá: mỗi
 * lần backend khởi động lại là mọi người phải đăng nhập lại — đặt JWT_SECRET trong .env để tránh.
 */
function resolveSecret(config: ConfigService<EnvironmentVariables, true>) {
  const secret = config.get('JWT_SECRET', { infer: true });
  if (secret) return secret;
  new Logger('AuthModule').warn(
    'Chưa đặt JWT_SECRET — dùng khóa tạm ngẫu nhiên; phiên đăng nhập sẽ mất mỗi lần backend khởi động lại. Thêm JWT_SECRET vào backend/.env (xem .env.example).',
  );
  return randomBytes(48).toString('hex');
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: resolveSecret(config),
        // Ghim thuật toán: không chấp nhận token tự khai "alg" khác.
        signOptions: { algorithm: 'HS256', expiresIn: SESSION_TTL_SECONDS },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => [
        {
          ttl: 60_000,
          limit: config.get('AUTH_RATE_LIMIT_PER_MINUTE', { infer: true }),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
