import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';

// Giá trị chỉ dùng trong test, không phải mật khẩu của tài khoản nào.
const SAMPLE = 'mat-khau-mau-de-test';
const SALT = '00ff'.repeat(8);
const KEY = 'ab'.repeat(64);

describe('password', () => {
  it('hash có dạng scrypt$N$r$p$salt$key và không chứa mật khẩu gốc', async () => {
    const hash = await hashPassword(SAMPLE);

    expect(hash).toMatch(/^scrypt\$32768\$8\$3\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hash).not.toContain(SAMPLE);
  });

  it('cùng một mật khẩu băm hai lần ra hai chuỗi khác nhau (salt ngẫu nhiên)', async () => {
    const [a, b] = await Promise.all([
      hashPassword(SAMPLE),
      hashPassword(SAMPLE),
    ]);

    expect(a).not.toBe(b);
    expect(await verifyPassword(SAMPLE, a)).toBe(true);
    expect(await verifyPassword(SAMPLE, b)).toBe(true);
  });

  it('mật khẩu sai → false, kể cả khi chỉ khác một ký tự hay khác hoa thường', async () => {
    const hash = await hashPassword(SAMPLE);

    expect(await verifyPassword(`${SAMPLE}x`, hash)).toBe(false);
    expect(await verifyPassword(SAMPLE.toUpperCase(), hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('giữ nguyên Unicode và khoảng trắng: không tự ý cắt gọt mật khẩu', async () => {
    const tricky = '  mật khẩu có dấu 食べる  ';
    const hash = await hashPassword(tricky);

    expect(await verifyPassword(tricky, hash)).toBe(true);
    expect(await verifyPassword(tricky.trim(), hash)).toBe(false);
  });

  it('kiểm bằng tham số GHI TRONG chuỗi: hash băm với độ khó cũ hơn vẫn kiểm được', async () => {
    // Dựng một hash với N nhỏ hơn hiện hành, như thể nó được tạo từ một phiên bản trước.
    const { scryptSync } = await import('node:crypto');
    const salt = Buffer.from(SALT, 'hex');
    const key = scryptSync(SAMPLE, salt, 64, { N: 1024, r: 8, p: 1 });
    const legacy = `scrypt$1024$8$1$${SALT}$${key.toString('hex')}`;

    expect(await verifyPassword(SAMPLE, legacy)).toBe(true);
    expect(await verifyPassword(`${SAMPLE}x`, legacy)).toBe(false);
  });

  it('DUMMY_HASH đúng định dạng hiện hành nhưng không khớp mật khẩu nào', async () => {
    expect(DUMMY_HASH).toMatch(/^scrypt\$32768\$8\$3\$0{32}\$0{128}$/);
    expect(await verifyPassword(SAMPLE, DUMMY_HASH)).toBe(false);
    expect(await verifyPassword('', DUMMY_HASH)).toBe(false);
  });

  it.each([
    ['null (dòng giữ chỗ chưa có mật khẩu)', null],
    ['undefined', undefined],
    ['chuỗi rỗng', ''],
    ['không đúng định dạng', 'khong-phai-hash'],
    ['thuật toán khác', `bcrypt$1024$8$1$${SALT}$${KEY}`],
    ['định dạng cũ không có tham số', `scrypt$${SALT}$${KEY}`],
    ['thiếu phần key', `scrypt$1024$8$1$${SALT}$`],
    ['key sai độ dài', `scrypt$1024$8$1$${SALT}$00ff`],
    ['key không phải hex', `scrypt$1024$8$1$${SALT}$${'zz'.repeat(64)}`],
    ['N không phải số', `scrypt$abc$8$1$${SALT}$${KEY}`],
    ['N = 0', `scrypt$0$8$1$${SALT}$${KEY}`],
    ['N không phải lũy thừa của 2', `scrypt$1000$8$1$${SALT}$${KEY}`],
    [
      'N khổng lồ (ép cấp phát hàng GB)',
      `scrypt$1073741824$8$1$${SALT}$${KEY}`,
    ],
    ['r khổng lồ', `scrypt$1024$9999$1$${SALT}$${KEY}`],
    ['p âm', `scrypt$1024$8$-1$${SALT}$${KEY}`],
  ])(
    'chuỗi lưu trữ hỏng — %s → false, không ném lỗi',
    async (_label, stored) => {
      await expect(verifyPassword(SAMPLE, stored)).resolves.toBe(false);
    },
  );
});
