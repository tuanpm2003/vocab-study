import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OTHER_OWNER, resetDatabase } from './helpers/app.js';
import { createStudyFixture, type StudyFixture } from './helpers/fixtures.js';

interface SessionBody {
  items: {
    vocabulary: {
      id: string;
      term: string;
      meaning: string;
      language: { id: string };
      collections: { id: string }[];
    };
  }[];
}

describe('GET /learning/session?mode=flashcard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fx: StudyFixture;
  const api = () => request(app.getHttpServer());

  async function session(query: string): Promise<string[]> {
    const res = await api()
      .get(`/learning/session?mode=flashcard&${query}`)
      .expect(200);
    return (res.body as SessionBody).items.map((item) => item.vocabulary.id);
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    fx = await createStudyFixture(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('không có phạm vi → lấy trong mọi từ của owner, đủ dữ liệu để hiện thẻ', async () => {
    const res = await api().get('/learning/session?mode=flashcard').expect(200);
    const body = res.body as SessionBody;

    expect(body.items).toHaveLength(8);
    const first = body.items[0]?.vocabulary;
    expect(first).toMatchObject({
      id: expect.any(String) as string,
      term: expect.any(String) as string,
      meaning: expect.any(String) as string,
    });
    expect(first).not.toHaveProperty('ownerId');
  });

  it('đúng phạm vi: language / level / collection', async () => {
    expect((await session(`languageId=${fx.ja}`)).sort()).toEqual(
      [...fx.jaWords].sort(),
    );
    expect((await session(`languageId=${fx.zh}`)).sort()).toEqual(
      [...fx.zhWords].sort(),
    );
    expect((await session(`levelId=${fx.n5}`)).sort()).toEqual(
      fx.jaWords.slice(0, 3).sort(),
    );
    expect((await session(`collectionId=${fx.food}`)).sort()).toEqual(
      [fx.jaWords[0], fx.jaWords[3]].sort(),
    );
    // kết hợp: Food ∩ N5 chỉ còn 食べる
    expect(await session(`collectionId=${fx.food}&levelId=${fx.n5}`)).toEqual([
      fx.jaWords[0],
    ]);
  });

  it('limit cắt đúng số từ, không trùng lặp, vẫn trong phạm vi', async () => {
    const ids = await session(`languageId=${fx.ja}&limit=4`);

    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    for (const id of ids) expect(fx.jaWords).toContain(id);
  });

  it('thứ tự ngẫu nhiên: 12 lần gọi cho ra nhiều hơn một thứ tự', async () => {
    const orders = new Set<string>();
    for (let i = 0; i < 12; i++) {
      orders.add((await session(`languageId=${fx.ja}`)).join(','));
    }
    // 6 từ có 720 hoán vị; 12 lần trùng hết một thứ tự có xác suất ~10^-31.
    expect(orders.size).toBeGreaterThan(1);
  });

  it('phạm vi không có từ nào → items rỗng, không lỗi', async () => {
    expect(await session('collectionId=khong-co')).toEqual([]);
  });

  it.each([
    ['thiếu mode', ''],
    ['mode lạ', 'mode=typing'],
    ['limit=0', 'mode=flashcard&limit=0'],
    ['limit=101', 'mode=flashcard&limit=101'],
    ['tham số lạ', 'mode=flashcard&ownerId=x'],
  ])('%s → 400', async (_label, query) => {
    await api().get(`/learning/session?${query}`).expect(400);
  });

  it('cách ly ownerId: không bao giờ trả từ của owner khác, kể cả khi chỉ đích danh', async () => {
    const foreign = await prisma.language.create({
      data: {
        ownerId: OTHER_OWNER,
        name: 'Secret',
        vocabularies: {
          create: { ownerId: OTHER_OWNER, term: '秘密', meaning: 'bí mật' },
        },
      },
    });

    expect(await session(`languageId=${foreign.id}`)).toEqual([]);
    expect(await session('limit=100')).toHaveLength(8);
  });
});
