// Chạy MỘT lần khi nâng một database đang dùng (có dữ liệu từ trước Phase 12) lên bản có
// đăng nhập:   npm run auth:prepare-legacy
//
// Việc nó làm: tạo dòng User "giữ chỗ" có id = LOCAL_OWNER_ID và CHƯA có mật khẩu, để migration
// thêm khóa ngoại `ownerId → User` chạy được trên dữ liệu cũ. Tài khoản đầu tiên đăng ký qua
// giao diện sẽ nhận dòng này cùng toàn bộ dữ liệu của nó (ADR-013).
//
// Idempotent, và không đụng tới dữ liệu nào: chỉ thêm tối đa một dòng vào bảng User.
// Database mới tinh thì không cần chạy.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env['DATABASE_URL'];
const legacyOwnerId = process.env['LOCAL_OWNER_ID'];
if (!connectionString) throw new Error('Thiếu DATABASE_URL trong backend/.env');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  if (!legacyOwnerId) {
    console.log('Không đặt LOCAL_OWNER_ID → không có dữ liệu cũ nào cần giữ chỗ.');
    return;
  }
  const [languages, vocabularies] = await Promise.all([
    prisma.language.count({ where: { ownerId: legacyOwnerId } }),
    prisma.vocabulary.count({ where: { ownerId: legacyOwnerId } }),
  ]);
  const existing = await prisma.user.findFirst({
    where: { id: legacyOwnerId },
  });
  if (existing) {
    console.log(
      existing.passwordHash
        ? `Dữ liệu cũ đã được tài khoản ${existing.email ?? '(không email)'} nhận.`
        : 'Dòng giữ chỗ đã có sẵn — đang chờ tài khoản đầu tiên đăng ký.',
    );
    return;
  }
  if (languages + vocabularies === 0) {
    console.log('Không có dữ liệu cũ → không cần dòng giữ chỗ.');
    return;
  }
  await prisma.user.create({ data: { id: legacyOwnerId } });
  console.log(
    `Đã tạo dòng giữ chỗ cho ${languages} ngôn ngữ và ${vocabularies} từ vựng. ` +
      'Tài khoản đầu tiên đăng ký sẽ nhận toàn bộ dữ liệu này.',
  );
}

await main().finally(() => prisma.$disconnect());
