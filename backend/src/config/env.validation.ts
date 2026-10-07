import {
  plainToInstance,
  Transform,
  type TransformFnParams,
} from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export const JWT_SECRET_MIN_LENGTH = 32;

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1'];

/**
 * `true` khi backend chỉ nghe trên chính máy này. Đây là dấu hiệu ĐÁNG TIN của "đang chạy local":
 * muốn đưa app lên mạng thì BẮT BUỘC phải đổi HOST (container cần 0.0.0.0), nên không thể quên —
 * khác với NODE_ENV, thứ rất dễ quên đặt trên server thật.
 */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.includes(host.trim().toLowerCase());
}

/**
 * Biến môi trường luôn là CHUỖI. `Boolean("false")` là true, nên phải tự đọc: chỉ
 * "false" / "0" / "no" / "off" mới tắt; không đặt biến thì dùng giá trị mặc định của field.
 */
function envBoolean({ obj, key }: TransformFnParams): unknown {
  // Đọc `obj[key]` (giá trị GỐC) chứ không đọc `value`: với enableImplicitConversion,
  // `value` đã bị ép Boolean("false") = true trước khi hàm này được gọi.
  const value: unknown = (obj as Record<string, unknown>)[key];
  if (typeof value === 'boolean' || value === undefined) return value;
  if (typeof value !== 'string') return value;
  const text = value.trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(text)) return false;
  if (['true', '1', 'yes', 'on'].includes(text)) return true;
  return value;
}

export class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV?: 'development' | 'test' | 'production';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  // 127.0.0.1: chỉ máy này gọi được API. Container (Phase 13) đặt HOST=0.0.0.0.
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

  // Từ Phase 12 đây KHÔNG còn là "người dùng hiện tại". Nó chỉ còn là id của dòng User giữ
  // chỗ cho dữ liệu có từ trước khi app có đăng nhập — tài khoản đầu tiên đăng ký sẽ nhận
  // dòng đó (ADR-013). Database mới tinh thì không cần đặt.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  LOCAL_OWNER_ID?: string;

  // "Hôm nay" trên Dashboard cắt theo múi giờ này, không theo UTC (ADR-011).
  @IsTimeZone({
    message:
      'APP_TIMEZONE phải là tên múi giờ IANA hợp lệ, ví dụ Asia/Ho_Chi_Minh',
  })
  APP_TIMEZONE: string = 'Asia/Ho_Chi_Minh';

  // Khóa ký JWT. Ai có khóa này thì tự cấp được phiên đăng nhập của bất kỳ ai.
  // Bắt buộc ở production (kiểm tra trong validateEnv); ở local thiếu thì AuthModule sinh
  // một khóa tạm ngẫu nhiên cho mỗi lần chạy.
  @IsOptional()
  @IsString()
  @MinLength(JWT_SECRET_MIN_LENGTH, {
    message: `JWT_SECRET cần ít nhất ${JWT_SECRET_MIN_LENGTH} ký tự ngẫu nhiên`,
  })
  JWT_SECRET?: string;

  // false = không ai đăng ký thêm được. Nên tắt sau khi đã có tài khoản và app lên mạng.
  @Transform(envBoolean)
  @IsBoolean({ message: 'REGISTRATION_ENABLED phải là true hoặc false' })
  REGISTRATION_ENABLED: boolean = true;

  // Số lần gọi /auth/login và /auth/register tối đa mỗi phút từ một địa chỉ IP.
  @IsInt()
  @Min(1)
  @Max(100_000)
  AUTH_RATE_LIMIT_PER_MINUTE: number = 10;
}

export function validateEnv(config: Record<string, unknown>) {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  const problems = errors.map(
    (e) =>
      `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
  );
  if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
    problems.push('  - JWT_SECRET: bắt buộc khi NODE_ENV=production');
  }
  // Thất bại an toàn: nghe ngoài loopback = người khác tới được API = phải cấu hình như
  // production. Nếu chỉ dựa vào NODE_ENV thì quên đặt nó là app chạy với khóa JWT tạm và
  // cookie không có cờ secure mà không báo lỗi gì.
  if (typeof env.HOST === 'string' && !isLoopbackHost(env.HOST)) {
    if (env.NODE_ENV !== 'production') {
      problems.push(
        `  - NODE_ENV: phải là "production" khi HOST=${env.HOST} (không phải địa chỉ loopback)`,
      );
    }
    if (!env.JWT_SECRET && env.NODE_ENV !== 'production') {
      problems.push(
        `  - JWT_SECRET: bắt buộc khi HOST=${env.HOST} (không phải địa chỉ loopback)`,
      );
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Biến môi trường không hợp lệ (xem backend/.env.example):\n${problems.join('\n')}`,
    );
  }
  return env;
}
