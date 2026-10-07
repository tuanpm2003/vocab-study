import { INestApplication } from '@nestjs/common';
import { authed } from './helpers/app.js';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OTHER_OWNER, resetDatabase } from './helpers/app.js';
import { createStudyFixture, type StudyFixture } from './helpers/fixtures.js';

interface QuizItem {
  vocabulary: { id: string; term: string; meaning: string };
  questionType: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
}

const JA_MEANINGS = ['ăn', 'uống', 'đi', 'nước', 'cá', 'tôi'];
const JA_TERMS = ['食べる', '飲む', '行く', '水', '魚', '私'];

describe('GET /learning/session?mode=multiple_choice (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fx: StudyFixture;
  const api = () => authed(app);

  async function quiz(query: string): Promise<QuizItem[]> {
    const res = await api()
      .get(`/learning/session?mode=multiple_choice&${query}`)
      .expect(200);
    return (res.body as { items: QuizItem[] }).items;
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

  it('mặc định "chọn nghĩa": prompt là từ, 4 lựa chọn khác nhau, đáp án đúng nằm đúng chỗ', async () => {
    const items = await quiz(`languageId=${fx.ja}`);

    expect(items).toHaveLength(6);
    for (const item of items) {
      expect(item.questionType).toBe('term_to_meaning');
      expect(item.prompt).toBe(item.vocabulary.term);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.choices[item.correctIndex]).toBe(item.vocabulary.meaning);
      // đáp án nhiễu chỉ lấy từ cùng ngôn ngữ
      for (const choice of item.choices) expect(JA_MEANINGS).toContain(choice);
    }
  });

  it('"chọn từ": prompt là nghĩa, lựa chọn là các từ cùng ngôn ngữ', async () => {
    const items = await quiz(
      `languageId=${fx.ja}&questionType=meaning_to_term`,
    );

    expect(items).toHaveLength(6);
    for (const item of items) {
      expect(item.prompt).toBe(item.vocabulary.meaning);
      expect(item.choices[item.correctIndex]).toBe(item.vocabulary.term);
      expect(new Set(item.choices).size).toBe(4);
      for (const choice of item.choices) expect(JA_TERMS).toContain(choice);
    }
  });

  it('phạm vi hẹp (1 từ) vẫn đủ 4 lựa chọn vì đáp án nhiễu lấy từ cả ngôn ngữ', async () => {
    const items = await quiz(`collectionId=${fx.food}&levelId=${fx.n5}`);

    expect(items).toHaveLength(1);
    expect(items[0]?.choices).toHaveLength(4);
  });

  it('ngôn ngữ có ít hơn 4 từ → 400 với thông điệp rõ ràng', async () => {
    const res = await api()
      .get(`/learning/session?mode=multiple_choice&languageId=${fx.zh}`)
      .expect(400);

    expect(res.body.message).toMatch(/Chưa đủ từ để làm trắc nghiệm/);
  });

  it('phiên trộn nhiều ngôn ngữ: bỏ từ của ngôn ngữ thiếu từ, giữ phần còn lại', async () => {
    const items = await quiz('limit=100');

    expect(items).toHaveLength(6);
    for (const item of items) expect(fx.jaWords).toContain(item.vocabulary.id);
  });

  it('phạm vi rỗng → items rỗng (không phải lỗi)', async () => {
    expect(await quiz('collectionId=khong-co')).toEqual([]);
  });

  it('questionType lạ → 400', async () => {
    await api()
      .get('/learning/session?mode=multiple_choice&questionType=typing')
      .expect(400);
  });

  it('đáp án nhiễu không bao giờ lấy từ dữ liệu của owner khác', async () => {
    const foreign = await prisma.language.create({
      data: { ownerId: OTHER_OWNER, name: 'Japanese' },
    });
    await prisma.vocabulary.createMany({
      data: ['bí mật 1', 'bí mật 2', 'bí mật 3', 'bí mật 4'].map(
        (meaning, i) => ({
          ownerId: OTHER_OWNER,
          languageId: foreign.id,
          term: `秘${i}`,
          meaning,
        }),
      ),
    });

    for (let i = 0; i < 5; i++) {
      for (const item of await quiz(`languageId=${fx.ja}`)) {
        for (const choice of item.choices) expect(choice).not.toMatch(/bí mật/);
      }
    }
  });
});
