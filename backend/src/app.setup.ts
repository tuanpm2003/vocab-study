import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { browserRequestGuard } from './common/middleware/browser-request-guard.js';
import type { EnvironmentVariables } from './config/env.validation.js';

/**
 * Cấu hình dùng chung cho main.ts VÀ e2e test.
 * Nếu chỉ đặt trong main.ts, e2e test sẽ chạy một app không có ValidationPipe
 * và pass những ca mà app thật từ chối.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  // Đăng ký TRƯỚC mọi thứ khác: request ghi từ trang web lạ phải bị loại trước khi body
  // được xử lý hay một route công khai (như /auth/register) kịp chạy.
  app.use(browserRequestGuard(config.get('CORS_ORIGIN', { infer: true })));

  // Đọc header Cookie thành request.cookies — JwtAuthGuard lấy phiên đăng nhập từ đó.
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    // credentials: cho phép trình duyệt gửi cookie đăng nhập trong request từ frontend
    // (khác cổng = khác origin). Chỉ an toàn vì `origin` ở trên là MỘT địa chỉ cụ thể,
    // không phải "*".
    credentials: true,
  });
  app.enableShutdownHooks();
}
