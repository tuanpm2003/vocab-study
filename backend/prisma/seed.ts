// Dữ liệu mẫu. Chạy: npx prisma db seed
// Idempotent: chạy bao nhiêu lần cũng không tạo bản ghi trùng (upsert theo khóa unique).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu ${name} trong backend/.env`);
  return value;
}

const ownerId = requireEnv('LOCAL_OWNER_ID');
const connectionString = requireEnv('DATABASE_URL');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const LANGUAGES = [
  { name: 'Japanese', code: 'ja' },
  { name: 'Chinese', code: 'zh' },
  { name: 'English', code: 'en' },
];

async function main(): Promise<void> {
  for (const language of LANGUAGES) {
    await prisma.language.upsert({
      where: { ownerId_name: { ownerId, name: language.name } },
      update: { code: language.code },
      create: { ownerId, ...language },
    });
  }
  console.log(
    `Seed xong: ${await prisma.language.count({ where: { ownerId } })} ngôn ngữ`,
  );
}

await main().finally(() => prisma.$disconnect());
