// Băm và kiểm mật khẩu bằng scrypt có sẵn trong Node — ADR-013.
// KHÔNG BAO GIỜ lưu mật khẩu gốc: chỉ lưu kết quả băm, thứ không đảo ngược lại được.

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 64;

interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

// Một trong các cấu hình tối thiểu OWASP chấp nhận cho scrypt (N=2^15, r=8, p=3): khoảng 32 MB
// bộ nhớ cho mỗi lần băm — đủ đắt cho kẻ bẻ khóa, vẫn vừa một container nhỏ.
const CURRENT: ScryptParams = { N: 32_768, r: 8, p: 3 };
// Trần khi ĐỌC tham số từ chuỗi đã lưu: một giá trị vô lý trong database không được phép
// khiến server cấp phát hàng GB bộ nhớ.
const LIMITS: ScryptParams = { N: 1_048_576, r: 16, p: 16 };

function derive(
  password: string,
  salt: Buffer,
  params: ScryptParams,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // scrypt cần ~128·N·r byte; mặc định Node chỉ cho 32 MB nên phải nới maxmem.
    const maxmem = 256 * params.N * params.r;
    scrypt(password, salt, KEY_BYTES, { ...params, maxmem }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function isPositiveInt(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= max;
}

/**
 * Trả chuỗi `scrypt$N$r$p$<salt hex>$<hash hex>`.
 *
 * Tham số nằm ngay trong chuỗi: sau này tăng độ khó cho mật khẩu mới thì mật khẩu cũ vẫn kiểm
 * được bằng đúng tham số nó đã được băm.
 * Salt ngẫu nhiên cho MỖI mật khẩu: hai người dùng cùng mật khẩu vẫn có hai hash khác nhau,
 * nên lộ database cũng không tra ngược hàng loạt bằng bảng băm tính sẵn được.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, CURRENT);
  return [
    PREFIX,
    CURRENT.N,
    CURRENT.r,
    CURRENT.p,
    salt.toString('hex'),
    key.toString('hex'),
  ].join('$');
}

/** `false` cho mọi trường hợp không khớp, kể cả khi chuỗi lưu trữ bị hỏng — không bao giờ ném lỗi. */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [prefix, n, r, p, saltHex, keyHex] = stored.split('$');
  if (prefix !== PREFIX || !saltHex || !keyHex) return false;

  const params: ScryptParams = { N: Number(n), r: Number(r), p: Number(p) };
  if (
    !isPositiveInt(params.N, LIMITS.N) ||
    !isPositiveInt(params.r, LIMITS.r) ||
    !isPositiveInt(params.p, LIMITS.p)
  ) {
    return false;
  }
  const expected = Buffer.from(keyHex, 'hex');
  if (expected.length !== KEY_BYTES) return false;

  try {
    const actual = await derive(password, Buffer.from(saltHex, 'hex'), params);
    // timingSafeEqual so sánh trong thời gian cố định: thời gian phản hồi không tiết lộ
    // hash đoán sai từ byte thứ mấy.
    return timingSafeEqual(actual, expected);
  } catch {
    // Tham số không hợp lệ với scrypt (ví dụ N không phải lũy thừa của 2).
    return false;
  }
}

/**
 * Một chuỗi đúng định dạng, đúng tham số hiện hành, nhưng không khớp mật khẩu nào.
 * Đăng nhập với email không tồn tại vẫn chạy đủ một lần scrypt trên chuỗi này, nên thời gian
 * phản hồi không tiết lộ email nào đã đăng ký.
 */
export const DUMMY_HASH = [
  PREFIX,
  CURRENT.N,
  CURRENT.r,
  CURRENT.p,
  '00'.repeat(SALT_BYTES),
  '00'.repeat(KEY_BYTES),
].join('$');
