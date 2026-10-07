import { INestApplication } from '@nestjs/common';
import { authed } from './helpers/app.js';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OTHER_OWNER, resetDatabase } from './helpers/app.js';

interface VocabBody {
  id: string;
  term: string;
  meaning: string;
  reading: string | null;
  notes: string | null;
  extra: Record<string, unknown> | null;
  language: { id: string; name: string };
  level: { id: string; name: string } | null;
  collections: { id: string; name: string }[];
  warnings?: { code: string; message: string; existingIds: string[] }[];
}

describe('Vocabularies (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ja: string;
  let zh: string;
  let n5: string;
  let hsk1: string;
  let lesson3: string;
  let food: string;
  let zhLesson: string;
  const api = () => authed(app);

  async function post<T>(url: string, body: object): Promise<T> {
    const res = await api().post(url).send(body).expect(201);
    return res.body as T;
  }

  async function createVocab(body: object): Promise<VocabBody> {
    return post<VocabBody>('/vocabularies', { languageId: ja, ...body });
  }

  async function list(query = ''): Promise<{
    items: VocabBody[];
    total: number;
    totalPages: number;
  }> {
    const res = await api().get(`/vocabularies?${query}`).expect(200);
    return res.body as {
      items: VocabBody[];
      total: number;
      totalPages: number;
    };
  }

  const terms = (items: VocabBody[]) => items.map((v) => v.term);

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    ja = (await post<{ id: string }>('/languages', { name: 'Japanese' })).id;
    zh = (await post<{ id: string }>('/languages', { name: 'Chinese' })).id;
    const jlpt = await post<{ levels: { id: string }[] }>(
      `/languages/${ja}/level-systems`,
      { name: 'JLPT', levels: [{ name: 'N5' }] },
    );
    const hsk = await post<{ levels: { id: string }[] }>(
      `/languages/${zh}/level-systems`,
      { name: 'HSK', levels: [{ name: 'HSK 1' }] },
    );
    n5 = jlpt.levels[0]?.id ?? '';
    hsk1 = hsk.levels[0]?.id ?? '';
    lesson3 = (
      await post<{ id: string }>('/collections', {
        languageId: ja,
        levelId: n5,
        name: 'Lesson 3',
      })
    ).id;
    food = (
      await post<{ id: string }>('/collections', {
        languageId: ja,
        name: 'Food',
        kind: 'TOPIC',
      })
    ).id;
    zhLesson = (
      await post<{ id: string }>('/collections', {
        languageId: zh,
        name: 'Zh 1',
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /vocabularies', () => {
    it('tạo 食べる thuộc 2 collection trong một request', async () => {
      const vocab = await createVocab({
        levelId: n5,
        collectionIds: [lesson3, food],
        term: '食べる',
        meaning: 'ăn',
        reading: 'たべる',
        romanization: 'taberu',
        exampleSentence: '毎日ご飯を食べます。',
        exampleTranslation: 'Tôi ăn cơm mỗi ngày.',
        extra: { verbGroup: 'ichidan', pitchAccent: 2 },
      });

      expect(vocab).toMatchObject({
        term: '食べる',
        meaning: 'ăn',
        reading: 'たべる',
        notes: null,
        extra: { verbGroup: 'ichidan', pitchAccent: 2 },
        language: { id: ja, name: 'Japanese' },
        level: { id: n5, name: 'N5' },
      });
      expect(vocab.collections.map((c) => c.name).sort()).toEqual([
        'Food',
        'Lesson 3',
      ]);
      expect(vocab).not.toHaveProperty('ownerId');
      expect(vocab).not.toHaveProperty('warnings');
      expect(await prisma.vocabularyCollection.count()).toBe(2);
    });

    it('chỉ cần term + meaning; chuỗi rỗng ở field tùy chọn được lưu thành null', async () => {
      const vocab = await createVocab({
        term: ' 水 ',
        meaning: 'nước',
        reading: '',
        notes: '   ',
      });

      expect(vocab).toMatchObject({
        term: '水',
        reading: null,
        notes: null,
        level: null,
        collections: [],
      });
    });

    it.each([
      ['thiếu term', { meaning: 'x' }],
      ['thiếu meaning', { term: 'x' }],
      ['term rỗng', { term: '  ', meaning: 'x' }],
      ['term quá dài', { term: 'a'.repeat(201), meaning: 'x' }],
      ['field lạ', { term: 'x', meaning: 'y', ownerId: 'h' }],
      [
        'collectionIds không phải mảng',
        { term: 'x', meaning: 'y', collectionIds: 'a' },
      ],
      [
        'collectionIds trùng',
        { term: 'x', meaning: 'y', collectionIds: ['a', 'a'] },
      ],
      ['extra không phải object', { term: 'x', meaning: 'y', extra: 'text' }],
    ])('%s → 400', async (_label, body) => {
      await api()
        .post('/vocabularies')
        .send({ languageId: ja, ...body })
        .expect(400);
      expect(await prisma.vocabulary.count()).toBe(0);
    });

    it('thiếu languageId → 400', async () => {
      await api()
        .post('/vocabularies')
        .send({ term: 'x', meaning: 'y' })
        .expect(400);
    });

    it('extra vượt 4KB → 400; vừa dưới ngưỡng → 201', async () => {
      await api()
        .post('/vocabularies')
        .send({
          languageId: ja,
          term: 'x',
          meaning: 'y',
          extra: { blob: 'a'.repeat(4096) },
        })
        .expect(400);
      await createVocab({
        term: 'x',
        meaning: 'y',
        extra: { blob: 'a'.repeat(4000) },
      });
    });

    it('language / level / collection không tồn tại → 404, không tạo gì', async () => {
      const base = { term: 'x', meaning: 'y' };
      await api()
        .post('/vocabularies')
        .send({ ...base, languageId: 'khong-co' })
        .expect(404);
      await api()
        .post('/vocabularies')
        .send({ ...base, languageId: ja, levelId: 'khong-co' })
        .expect(404);
      await api()
        .post('/vocabularies')
        .send({ ...base, languageId: ja, collectionIds: [lesson3, 'khong-co'] })
        .expect(404);
      expect(await prisma.vocabulary.count()).toBe(0);
    });

    it('level hoặc collection của ngôn ngữ khác → 400', async () => {
      const base = { languageId: ja, term: 'x', meaning: 'y' };
      await api()
        .post('/vocabularies')
        .send({ ...base, levelId: hsk1 })
        .expect(400);
      const res = await api()
        .post('/vocabularies')
        .send({ ...base, collectionIds: [lesson3, zhLesson] })
        .expect(400);
      expect(res.body.message).toBe(
        'Collection không thuộc cùng ngôn ngữ với từ',
      );
      expect(await prisma.vocabulary.count()).toBe(0);
    });
  });

  describe('cảnh báo trùng từ', () => {
    it('thêm 行 lần hai → 201 kèm warnings chứa id từ cũ, KHÔNG phải 409', async () => {
      const first = await createVocab({
        term: '行',
        meaning: 'đi',
        collectionIds: [lesson3],
      });

      const second = await createVocab({ term: '行', meaning: 'hàng, dòng' });

      expect(second.warnings).toEqual([
        {
          code: 'POSSIBLE_DUPLICATE',
          message: 'Từ này đã có trong Lesson 3',
          existingIds: [first.id],
        },
      ]);
      expect(await prisma.vocabulary.count()).toBe(2);
    });

    it('từ cũ không thuộc collection nào → thông điệp chung', async () => {
      await createVocab({ term: 'bank', meaning: 'ngân hàng' });
      const second = await createVocab({ term: 'bank', meaning: 'bờ sông' });
      expect(second.warnings?.[0]?.message).toBe(
        'Từ này đã có trong danh sách',
      );
    });

    it('cùng mặt chữ ở ngôn ngữ khác hoặc owner khác thì không cảnh báo', async () => {
      await post('/vocabularies', {
        languageId: zh,
        term: '行',
        meaning: 'đi',
      });
      const foreign = await prisma.language.create({
        data: { ownerId: OTHER_OWNER, name: 'Japanese' },
      });
      await prisma.vocabulary.create({
        data: {
          ownerId: OTHER_OWNER,
          languageId: foreign.id,
          term: '行',
          meaning: 'x',
        },
      });

      const vocab = await createVocab({ term: '行', meaning: 'đi' });

      expect(vocab).not.toHaveProperty('warnings');
    });
  });

  describe('GET /vocabularies', () => {
    beforeEach(async () => {
      await createVocab({
        term: '食べる',
        meaning: 'ăn',
        reading: 'たべる',
        romanization: 'taberu',
        levelId: n5,
        collectionIds: [lesson3, food],
      });
      await createVocab({
        term: '飲む',
        meaning: 'uống',
        reading: 'のむ',
        romanization: 'nomu',
        collectionIds: [food],
      });
      await createVocab({ term: '行く', meaning: 'đi', reading: 'いく' });
      await post('/vocabularies', {
        languageId: zh,
        term: '你好',
        meaning: 'Xin chào',
        reading: 'nǐ hǎo',
      });
    });

    it('mặc định: mới nhất trước, envelope đúng, kèm quan hệ', async () => {
      const res = await list();

      expect(res.total).toBe(4);
      expect(terms(res.items)).toEqual(['你好', '行く', '飲む', '食べる']);
      expect(res.items[3]?.collections).toHaveLength(2);
    });

    it.each([
      ['taber', ['食べる']],
      ['TABER', ['食べる']],
      ['たべ', ['食べる']],
      ['食', ['食べる']],
      ['uống', ['飲む']],
      ['XIN CHÀO', ['你好']],
      ['nǐ', ['你好']],
      ['khong-co-tu-nay', []],
    ])('search=%s → %j', async (search, expected) => {
      const res = await list(`search=${encodeURIComponent(search)}`);
      expect(terms(res.items)).toEqual(expected);
    });

    it('lọc theo language / level / collection và kết hợp với search', async () => {
      expect((await list(`languageId=${zh}`)).total).toBe(1);
      expect(terms((await list(`levelId=${n5}`)).items)).toEqual(['食べる']);
      expect((await list(`collectionId=${food}`)).total).toBe(2);
      expect(
        terms((await list(`collectionId=${food}&search=nomu`)).items),
      ).toEqual(['飲む']);
      expect((await list(`languageId=${zh}&collectionId=${food}`)).total).toBe(
        0,
      );
    });

    it('sort trong whitelist hoạt động; ngoài whitelist → 400', async () => {
      const asc = await list('sort=createdAt:asc');
      expect(terms(asc.items)).toEqual(['食べる', '飲む', '行く', '你好']);

      const byTerm = await list('sort=term:asc');
      expect(terms(byTerm.items)).toEqual([...terms(byTerm.items)].sort());

      await api().get('/vocabularies?sort=hack:asc').expect(400);
      await api().get('/vocabularies?sort=ownerId:asc').expect(400);
    });

    it('phân trang; limit>100, page=0 → 400; trang quá xa → rỗng', async () => {
      const page2 = await list('page=2&limit=3');
      expect(page2.total).toBe(4);
      expect(page2.totalPages).toBe(2);
      expect(page2.items).toHaveLength(1);

      expect((await list('page=9')).items).toEqual([]);
      await api().get('/vocabularies?limit=101').expect(400);
      await api().get('/vocabularies?page=0').expect(400);
    });

    it('số truy vấn không phụ thuộc số dòng trả về (không N+1)', async () => {
      const queries: string[] = [];
      const listener = (e: { query: string }) => queries.push(e.query);
      const countFor = async (limit: number): Promise<number> => {
        queries.length = 0;
        await list(`limit=${limit}`);
        return queries.length;
      };
      prisma.$on('query' as never, listener as never);

      const one = await countFor(1);
      const many = await countFor(100);

      expect(one).toBeGreaterThan(0);
      expect(many).toBe(one);
    });
  });

  describe('GET/PATCH/DELETE /vocabularies/:id', () => {
    it('id không tồn tại → 404', async () => {
      await api().get('/vocabularies/khong-co').expect(404);
      await api()
        .patch('/vocabularies/khong-co')
        .send({ meaning: 'x' })
        .expect(404);
      await api().delete('/vocabularies/khong-co').expect(404);
    });

    it('PATCH một phần → chỉ field được gửi thay đổi, collection giữ nguyên', async () => {
      const vocab = await createVocab({
        term: '食べる',
        meaning: 'ăn',
        reading: 'たべる',
        collectionIds: [lesson3],
      });

      const res = await api()
        .patch(`/vocabularies/${vocab.id}`)
        .send({ meaning: 'ăn (cơm)' })
        .expect(200);

      expect(res.body).toMatchObject({
        term: '食べる',
        meaning: 'ăn (cơm)',
        reading: 'たべる',
        collections: [{ id: lesson3, name: 'Lesson 3' }],
      });
    });

    it('PATCH null xóa field tùy chọn và extra', async () => {
      const vocab = await createVocab({
        term: 'x',
        meaning: 'y',
        reading: 'r',
        levelId: n5,
        extra: { a: 1 },
      });

      const res = await api()
        .patch(`/vocabularies/${vocab.id}`)
        .send({ reading: null, levelId: null, extra: null })
        .expect(200);

      expect(res.body).toMatchObject({
        reading: null,
        level: null,
        extra: null,
      });
    });

    it('PATCH collectionIds thay TOÀN BỘ danh sách; [] gỡ hết', async () => {
      const vocab = await createVocab({
        term: 'x',
        meaning: 'y',
        collectionIds: [lesson3],
      });

      const replaced = await api()
        .patch(`/vocabularies/${vocab.id}`)
        .send({ collectionIds: [food] })
        .expect(200);
      expect((replaced.body as VocabBody).collections).toEqual([
        { id: food, name: 'Food' },
      ]);

      const cleared = await api()
        .patch(`/vocabularies/${vocab.id}`)
        .send({ collectionIds: [] })
        .expect(200);
      expect((cleared.body as VocabBody).collections).toEqual([]);
    });

    it('PATCH collectionIds không hợp lệ → lỗi và danh sách cũ còn nguyên', async () => {
      const vocab = await createVocab({
        term: 'x',
        meaning: 'y',
        collectionIds: [lesson3, food],
      });

      await api()
        .patch(`/vocabularies/${vocab.id}`)
        .send({ collectionIds: [food, 'khong-co'] })
        .expect(404);
      await api()
        .patch(`/vocabularies/${vocab.id}`)
        .send({ collectionIds: [zhLesson] })
        .expect(400);

      const res = await api().get(`/vocabularies/${vocab.id}`).expect(200);
      expect((res.body as VocabBody).collections).toHaveLength(2);
    });

    it('PATCH languageId → 400 (không chuyển ngôn ngữ được)', async () => {
      const vocab = await createVocab({ term: 'x', meaning: 'y' });
      await api()
        .patch(`/vocabularies/${vocab.id}`)
        .send({ languageId: zh })
        .expect(400);
    });

    it('DELETE → 204, dòng bảng nối cũng biến mất, collection còn nguyên', async () => {
      const vocab = await createVocab({
        term: 'x',
        meaning: 'y',
        collectionIds: [lesson3, food],
      });

      await api().delete(`/vocabularies/${vocab.id}`).expect(204);

      expect(await prisma.vocabularyCollection.count()).toBe(0);
      expect(await prisma.collection.count()).toBe(3);
      await api().get(`/vocabularies/${vocab.id}`).expect(404);
    });
  });

  describe('quan hệ N-N và cascade', () => {
    it('xóa 1 collection → từ vẫn còn ở collection kia', async () => {
      const vocab = await createVocab({
        term: '食べる',
        meaning: 'ăn',
        collectionIds: [lesson3, food],
      });

      await api().delete(`/collections/${lesson3}`).expect(204);

      const res = await api().get(`/vocabularies/${vocab.id}`).expect(200);
      expect((res.body as VocabBody).collections).toEqual([
        { id: food, name: 'Food' },
      ]);
    });

    it('xóa level → từ còn nguyên, level về null', async () => {
      const vocab = await createVocab({ term: 'x', meaning: 'y', levelId: n5 });

      await api().delete(`/levels/${n5}`).expect(204);

      const res = await api().get(`/vocabularies/${vocab.id}`).expect(200);
      expect((res.body as VocabBody).level).toBeNull();
    });

    it('xóa language → cascade xóa từ vựng và bảng nối', async () => {
      await createVocab({ term: 'x', meaning: 'y', collectionIds: [food] });

      await api().delete(`/languages/${ja}`).expect(204);

      expect(await prisma.vocabulary.count()).toBe(0);
      expect(await prisma.vocabularyCollection.count()).toBe(0);
    });

    it('vocabularyCount của language và collection đếm đúng', async () => {
      await createVocab({
        term: 'a',
        meaning: '1',
        collectionIds: [lesson3, food],
      });
      await createVocab({ term: 'b', meaning: '2', collectionIds: [food] });

      const languages = await api().get('/languages').expect(200);
      const counts = Object.fromEntries(
        (
          languages.body as {
            items: { name: string; vocabularyCount: number }[];
          }
        ).items.map((l) => [l.name, l.vocabularyCount]),
      );
      expect(counts).toEqual({ Japanese: 2, Chinese: 0 });

      const foodRes = await api().get(`/collections/${food}`).expect(200);
      const lessonRes = await api().get(`/collections/${lesson3}`).expect(200);
      expect(foodRes.body.vocabularyCount).toBe(2);
      expect(lessonRes.body.vocabularyCount).toBe(1);
      const detail = await api().get(`/languages/${ja}`).expect(200);
      expect(detail.body.vocabularyCount).toBe(2);
    });
  });

  it('cách ly ownerId: không thấy / sửa / xóa / gắn vào dữ liệu của owner khác', async () => {
    const foreign = await prisma.language.create({
      data: {
        ownerId: OTHER_OWNER,
        name: 'Secret',
        collections: { create: { name: 'Hidden' } },
        vocabularies: {
          create: { ownerId: OTHER_OWNER, term: '秘密', meaning: 'bí mật' },
        },
      },
      include: { collections: true, vocabularies: true },
    });
    const secret = foreign.vocabularies[0];
    const hidden = foreign.collections[0];
    if (!secret || !hidden) throw new Error('fixture lỗi');

    expect((await list()).total).toBe(0);
    expect((await list(`languageId=${foreign.id}`)).total).toBe(0);
    expect((await list('search=秘密')).total).toBe(0);
    await api().get(`/vocabularies/${secret.id}`).expect(404);
    await api()
      .patch(`/vocabularies/${secret.id}`)
      .send({ meaning: 'hacked' })
      .expect(404);
    await api().delete(`/vocabularies/${secret.id}`).expect(404);
    // Không gắn được từ của mình vào collection của người khác
    await api()
      .post('/vocabularies')
      .send({
        languageId: ja,
        term: 'x',
        meaning: 'y',
        collectionIds: [hidden.id],
      })
      .expect(404);

    expect(
      (await prisma.vocabulary.findFirst({ where: { id: secret.id } }))
        ?.meaning,
    ).toBe('bí mật');
  });
});
