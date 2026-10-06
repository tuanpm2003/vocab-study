import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  // 127.0.0.1: chỉ máy này gọi được API. API chưa có đăng nhập, nên mở ra 0.0.0.0
  // nghĩa là ai cùng mạng Wi-Fi cũng đọc/sửa được dữ liệu. Container (Phase 13) đặt HOST=0.0.0.0.
  @IsString()
  @IsNotEmpty()
  HOST: string = '127.0.0.1';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  // require_protocol: trình duyệt gửi Origin kèm "http://". Thiếu nó, CORS so khớp
  // không bao giờ trúng và lỗi chỉ lộ ra ở trình duyệt, rất khó lần ngược.
  @IsUrl({ require_tld: false, require_protocol: true })
  CORS_ORIGIN: string;

  @IsString()
  @IsNotEmpty()
  LOCAL_OWNER_ID: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(
      `Biến môi trường không hợp lệ (xem backend/.env.example):\n${detail}`,
    );
  }
  return env;
}
