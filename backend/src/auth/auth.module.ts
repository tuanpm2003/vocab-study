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
import { isPasswordAttempt } from './password-attempt.decorator.js';

/**
 * Production bắt buộc có JWT_SECRET (validateEnv đã chặn từ lúc khởi động).
 * Ở máy local, thiếu thì sinh một khóa NGẪU NHIÊN cho lần chạy này thay vì dùng một khóa
 * viết sẵn trong code: app vẫn chạy ngay, không có secret nào nằm trong repo. Cái giá: mỗi
 * lần backend khởi động lại là mọi người phải đăng nhập lại — đặt JWT_SECRET trong .env để tránh.
 */
const AUTH_BLOCK_MS = 15 * 60_000;

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
      // Hai bộ đếm độc lập cho mỗi IP. ThrottlerGuard toàn cục (app.module.ts) áp cả hai;
      // `skipIf` giữ bộ đếm chặt chỉ cho route nhận mật khẩu.
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => [
        {
          name: 'api',
          ttl: 60_000,
          limit: config.get('API_RATE_LIMIT_PER_MINUTE', { infer: true }),
          // Mặc định thư viện đếm riêng cho từng route. Bộ đếm chung phải gộp mọi route
          // của một IP, nếu không giới hạn thật là "limit × số endpoint".
          generateKey: (_context, tracker, name) => `${name}:${tracker}`,
        },
        {
          name: 'auth',
          ttl: 60_000,
          limit: config.get('AUTH_RATE_LIMIT_PER_MINUTE', { infer: true }),
          // Vượt giới hạn thì khóa 15 phút, không phải hết phút là thử tiếp: từ ~14.400 lần
          // đoán mỗi ngày từ một IP xuống dưới 1.000.
          blockDuration: AUTH_BLOCK_MS,
          skipIf: (context) => !isPasswordAttempt(context),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
