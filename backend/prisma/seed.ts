// Dữ liệu mẫu. Chạy: npx prisma db seed
// Idempotent: chạy bao nhiêu lần cũng không tạo bản ghi trùng. Bảng có khóa unique thì
// upsert; bảng không có (LevelSystem, Collection, Vocabulary) thì tìm trước rồi mới tạo.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { SEED, type SeedWord } from './seed-data.js';

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

async function seedLevels(
  languageId: string,
  systemName: string,
  levelNames: string[],
): Promise<Map<string, string>> {
  const system =
    (await prisma.levelSystem.findFirst({
      where: { languageId, name: systemName },
    })) ??
    (await prisma.levelSystem.create({
      data: { languageId, name: systemName, isDefault: true },
    }));

  const ids = new Map<string, string>();
  for (const [index, name] of levelNames.entries()) {
    const level = await prisma.level.upsert({
      where: { levelSystemId_name: { levelSystemId: system.id, name } },
      update: {},
      create: { levelSystemId: system.id, name, order: index + 1 },
    });
    ids.set(name, level.id);
  }
  return ids;
}

async function seedCollection(
  languageId: string,
  name: string,
  kind: 'LESSON' | 'TOPIC',
  levelId: string | null,
): Promise<string> {
  const existing = await prisma.collection.findFirst({
    where: { languageId, name },
  });
  if (existing) return existing.id;
  const created = await prisma.collection.create({
    data: { languageId, name, kind, levelId },
  });
  return created.id;
}

async function seedWord(
  languageId: string,
  word: SeedWord,
  levelIds: Map<string, string>,
  collectionIds: Map<string, string>,
): Promise<void> {
  const existing = await prisma.vocabulary.findFirst({
    where: { ownerId, languageId, term: word.term, meaning: word.meaning },
  });
  if (existing) return;
  await prisma.vocabulary.create({
    data: {
      ownerId,
      languageId,
      levelId: word.level ? (levelIds.get(word.level) ?? null) : null,
      term: word.term,
      meaning: word.meaning,
      reading: word.reading ?? null,
      romanization: word.romanization ?? null,
      exampleSentence: word.example ?? null,
      exampleTranslation: word.exampleTranslation ?? null,
      collections: {
        create: word.collections.flatMap((name) => {
          const collectionId = collectionIds.get(name);
          return collectionId ? [{ collectionId }] : [];
        }),
      },
    },
  });
}

async function main(): Promise<void> {
  // Dữ liệu mẫu phải có chủ (khóa ngoại ownerId → User). Nếu chưa ai mang id này thì tạo một
  // dòng giữ chỗ CHƯA có mật khẩu: tài khoản đầu tiên đăng ký sẽ nhận nó cùng dữ liệu mẫu
  // (ADR-013). Nếu id này đã là một tài khoản thật thì dữ liệu mẫu thuộc về tài khoản đó.
  await prisma.user.upsert({
    where: { id: ownerId },
    update: {},
    create: { id: ownerId },
  });

  for (const entry of SEED) {
    const language = await prisma.language.upsert({
      where: { ownerId_name: { ownerId, name: entry.name } },
      update: { code: entry.code },
      create: { ownerId, name: entry.name, code: entry.code },
    });
    const levelIds = await seedLevels(
      language.id,
      entry.levelSystem,
      entry.levels,
    );
    const collectionIds = new Map<string, string>();
    for (const collection of entry.collections) {
      collectionIds.set(
        collection.name,
        await seedCollection(
          language.id,
          collection.name,
          collection.kind,
          collection.level ? (levelIds.get(collection.level) ?? null) : null,
        ),
      );
    }
    for (const word of entry.words) {
      await seedWord(language.id, word, levelIds, collectionIds);
    }
  }

  const [languages, vocabularies] = await Promise.all([
    prisma.language.count({ where: { ownerId } }),
    prisma.vocabulary.count({ where: { ownerId } }),
  ]);
  console.log(`Seed xong: ${languages} ngôn ngữ, ${vocabularies} từ vựng`);
}

await main().finally(() => prisma.$disconnect());
