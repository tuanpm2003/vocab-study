import 'reflect-metadata';
import { validateEnv } from './env.validation.js';

const validConfig = {
  PORT: '4000',
  HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://vocab:pw@localhost:5434/vocab_dev',
  CORS_ORIGIN: 'http://localhost:3000',
  LOCAL_OWNER_ID: 'local-owner',
};

describe('validateEnv', () => {
  it('chấp nhận cấu hình hợp lệ và chuyển PORT sang number', () => {
    const env = validateEnv(validConfig);

    expect(env.PORT).toBe(4000);
    expect(typeof env.PORT).toBe('number');
    expect(env.DATABASE_URL).toBe(validConfig.DATABASE_URL);
    expect(env.CORS_ORIGIN).toBe(validConfig.CORS_ORIGIN);
    expect(env.LOCAL_OWNER_ID).toBe('local-owner');
  });

  it('dùng giá trị mặc định cho PORT và HOST khi không có trong env', () => {
    const { PORT: _PORT, HOST: _HOST, ...rest } = validConfig;

    const env = validateEnv(rest);

    expect(env.PORT).toBe(4000);
    expect(env.HOST).toBe('127.0.0.1');
  });

  it('thiếu DATABASE_URL → ném lỗi rõ ràng nhắc tên biến', () => {
    const { DATABASE_URL: _DATABASE_URL, ...rest } = validConfig;

    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('thiếu CORS_ORIGIN → ném lỗi rõ ràng nhắc tên biến', () => {
    const { CORS_ORIGIN: _CORS_ORIGIN, ...rest } = validConfig;

    expect(() => validateEnv(rest)).toThrow(/CORS_ORIGIN/);
  });

  it('thiếu LOCAL_OWNER_ID → ném lỗi rõ ràng nhắc tên biến', () => {
    const { LOCAL_OWNER_ID: _LOCAL_OWNER_ID, ...rest } = validConfig;

    expect(() => validateEnv(rest)).toThrow(/LOCAL_OWNER_ID/);
  });

  // BUG: @IsUrl({ require_tld: false }) không ép buộc có protocol (http://),
  // nên một chuỗi bất kỳ không khoảng trắng (kể cả tiếng Việt không dấu URL-encode
  // được) bị coi là "URL hợp lệ". CORS_ORIGIN dùng cho app.enableCors({ origin })
  // nên phải có protocol mới hoạt động đúng — env.validation.ts:28.
  it('CORS_ORIGIN không có protocol (chuỗi bất kỳ) → phải bị từ chối', () => {
    expect(() =>
      validateEnv({ ...validConfig, CORS_ORIGIN: 'không-phải-url' }),
    ).toThrow(/CORS_ORIGIN/);
  });

  it('CORS_ORIGIN chỉ là một từ không có protocol → phải bị từ chối', () => {
    expect(() =>
      validateEnv({ ...validConfig, CORS_ORIGIN: 'justword' }),
    ).toThrow(/CORS_ORIGIN/);
  });

  it('PORT vượt quá 65535 → ném lỗi nhắc PORT', () => {
    expect(() => validateEnv({ ...validConfig, PORT: '70000' })).toThrow(
      /PORT/,
    );
  });

  it('PORT bằng 0 (dưới ngưỡng Min) → ném lỗi nhắc PORT', () => {
    expect(() => validateEnv({ ...validConfig, PORT: '0' })).toThrow(/PORT/);
  });

  it('PORT không phải số → ném lỗi nhắc PORT', () => {
    expect(() => validateEnv({ ...validConfig, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('DATABASE_URL rỗng → ném lỗi (chuỗi rỗng không hợp lệ)', () => {
    expect(() => validateEnv({ ...validConfig, DATABASE_URL: '' })).toThrow(
      /DATABASE_URL/,
    );
  });
});
