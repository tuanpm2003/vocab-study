import 'reflect-metadata';
import { isLoopbackHost, validateEnv } from './env.validation.js';

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

  it('LOCAL_OWNER_ID là tùy chọn từ Phase 12 (chỉ còn là id của dòng giữ chỗ dữ liệu cũ)', () => {
    const { LOCAL_OWNER_ID: _LOCAL_OWNER_ID, ...rest } = validConfig;

    expect(validateEnv(rest).LOCAL_OWNER_ID).toBeUndefined();
    expect(() => validateEnv({ ...rest, LOCAL_OWNER_ID: '' })).toThrow(
      /LOCAL_OWNER_ID/,
    );
  });

  describe('JWT_SECRET', () => {
    // Chuỗi mẫu cho test, không phải khóa của môi trường nào.
    const sample = 'x'.repeat(32);

    it('ngoài production: không bắt buộc (AuthModule tự sinh khóa tạm)', () => {
      expect(validateEnv(validConfig).JWT_SECRET).toBeUndefined();
      expect(
        validateEnv({ ...validConfig, NODE_ENV: 'development' }).JWT_SECRET,
      ).toBeUndefined();
    });

    it('production mà thiếu → từ chối khởi động', () => {
      expect(() =>
        validateEnv({ ...validConfig, NODE_ENV: 'production' }),
      ).toThrow(/JWT_SECRET: bắt buộc khi NODE_ENV=production/);
    });

    it('production có khóa đủ dài → chấp nhận', () => {
      const env = validateEnv({
        ...validConfig,
        NODE_ENV: 'production',
        JWT_SECRET: sample,
      });
      expect(env.JWT_SECRET).toBe(sample);
    });

    it('khóa ngắn hơn 32 ký tự → từ chối ở mọi môi trường', () => {
      expect(() =>
        validateEnv({ ...validConfig, JWT_SECRET: 'ngan-qua' }),
      ).toThrow(/JWT_SECRET cần ít nhất 32 ký tự/);
    });
  });

  describe('REGISTRATION_ENABLED', () => {
    it('mặc định bật', () => {
      expect(validateEnv(validConfig).REGISTRATION_ENABLED).toBe(true);
    });

    it.each(['false', 'FALSE', '0', 'no', 'off'])(
      'chuỗi "%s" tắt đăng ký — không bị ép Boolean("false") = true',
      (value) => {
        expect(
          validateEnv({ ...validConfig, REGISTRATION_ENABLED: value })
            .REGISTRATION_ENABLED,
        ).toBe(false);
      },
    );

    it.each(['true', '1', 'yes', 'on'])('chuỗi "%s" bật đăng ký', (value) => {
      expect(
        validateEnv({ ...validConfig, REGISTRATION_ENABLED: value })
          .REGISTRATION_ENABLED,
      ).toBe(true);
    });

    it('giá trị không hiểu được → báo lỗi thay vì đoán', () => {
      expect(() =>
        validateEnv({ ...validConfig, REGISTRATION_ENABLED: 'co-le' }),
      ).toThrow(/REGISTRATION_ENABLED/);
    });
  });

  it('NODE_ENV lạ → từ chối', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'prod' })).toThrow(
      /NODE_ENV/,
    );
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

describe('validateEnv — thất bại an toàn khi nghe ngoài loopback (rà soát bảo mật Phase 12)', () => {
  const base = {
    DATABASE_URL: 'postgresql://vocab:pw@localhost:5434/vocab_dev',
    CORS_ORIGIN: 'http://localhost:3000',
  };
  // Chuỗi mẫu cho test, không phải khóa của môi trường nào.
  const secret = 'y'.repeat(32);

  it.each(['127.0.0.1', 'localhost', '::1', ' LOCALHOST '])(
    'HOST=%s là loopback → không đòi NODE_ENV hay JWT_SECRET',
    (HOST) => {
      expect(() => validateEnv({ ...base, HOST })).not.toThrow();
      expect(isLoopbackHost(HOST)).toBe(true);
    },
  );

  it.each(['0.0.0.0', '192.168.1.10', '::', 'api.example.com'])(
    'HOST=%s mà quên NODE_ENV → từ chối khởi động, nêu rõ cả hai biến',
    (HOST) => {
      expect(isLoopbackHost(HOST)).toBe(false);
      expect(() => validateEnv({ ...base, HOST })).toThrow(
        /NODE_ENV: phải là "production"[\s\S]*JWT_SECRET: bắt buộc/,
      );
    },
  );

  it('HOST công khai + có JWT_SECRET nhưng NODE_ENV=development → vẫn từ chối (cookie sẽ thiếu cờ secure)', () => {
    expect(() =>
      validateEnv({
        ...base,
        HOST: '0.0.0.0',
        NODE_ENV: 'development',
        JWT_SECRET: secret,
      }),
    ).toThrow(/NODE_ENV: phải là "production"/);
  });

  it('HOST công khai + production nhưng thiếu JWT_SECRET → từ chối', () => {
    expect(() =>
      validateEnv({ ...base, HOST: '0.0.0.0', NODE_ENV: 'production' }),
    ).toThrow(/JWT_SECRET/);
  });

  it('HOST công khai + production + JWT_SECRET → chấp nhận', () => {
    expect(() =>
      validateEnv({
        ...base,
        HOST: '0.0.0.0',
        NODE_ENV: 'production',
        JWT_SECRET: secret,
      }),
    ).not.toThrow();
  });
});
