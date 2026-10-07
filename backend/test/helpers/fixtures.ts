import type { INestApplication } from '@nestjs/common';
import { authed } from './app.js';
import type { App } from 'supertest/types';

export interface StudyFixture {
  ja: string;
  zh: string;
  n5: string;
  lesson: string;
  food: string;
  /** 6 từ tiếng Nhật: 3 từ đầu thuộc N5 + Lesson, 2 từ thuộc Food (1 từ thuộc cả hai). */
  jaWords: string[];
  /** 2 từ tiếng Trung. */
  zhWords: string[];
}

const JA_WORDS = [
  { term: '食べる', meaning: 'ăn' },
  { term: '飲む', meaning: 'uống' },
  { term: '行く', meaning: 'đi' },
  { term: '水', meaning: 'nước' },
  { term: '魚', meaning: 'cá' },
  { term: '私', meaning: 'tôi' },
];

/** Dựng dữ liệu chung cho các e2e test của Learning, hoàn toàn qua API thật. */
export async function createStudyFixture(
  app: INestApplication<App>,
): Promise<StudyFixture> {
  const post = async <T>(url: string, body: object): Promise<T> => {
    const res = await authed(app).post(url).send(body).expect(201);
    return res.body as T;
  };
  type WithId = { id: string };

  const ja = (await post<WithId>('/languages', { name: 'Japanese' })).id;
  const zh = (await post<WithId>('/languages', { name: 'Chinese' })).id;
  const system = await post<{ levels: WithId[] }>(
    `/languages/${ja}/level-systems`,
    { name: 'JLPT', levels: [{ name: 'N5' }] },
  );
  const n5 = system.levels[0]?.id ?? '';
  const lesson = (
    await post<WithId>('/collections', {
      languageId: ja,
      levelId: n5,
      name: 'Lesson',
    })
  ).id;
  const food = (
    await post<WithId>('/collections', {
      languageId: ja,
      name: 'Food',
      kind: 'TOPIC',
    })
  ).id;

  const jaWords: string[] = [];
  for (const [index, word] of JA_WORDS.entries()) {
    const collectionIds = [
      ...(index < 3 ? [lesson] : []),
      ...(index === 0 || index === 3 ? [food] : []),
    ];
    const created = await post<WithId>('/vocabularies', {
      languageId: ja,
      levelId: index < 3 ? n5 : null,
      collectionIds,
      ...word,
    });
    jaWords.push(created.id);
  }

  const zhWords: string[] = [];
  for (const word of [
    { term: '你好', meaning: 'xin chào' },
    { term: '谢谢', meaning: 'cảm ơn' },
  ]) {
    zhWords.push(
      (await post<WithId>('/vocabularies', { languageId: zh, ...word })).id,
    );
  }

  return { ja, zh, n5, lesson, food, jaWords, zhWords };
}
