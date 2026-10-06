// Nội dung seed, tách khỏi logic để dễ đọc và dễ thêm từ.
// Một số từ cố ý thuộc NHIỀU collection (bài học + chủ đề) để thử quan hệ N-N.

export interface SeedWord {
  term: string;
  meaning: string;
  reading?: string;
  romanization?: string;
  example?: string;
  exampleTranslation?: string;
  level?: string;
  collections: string[];
}

export interface SeedLanguage {
  name: string;
  code: string;
  levelSystem: string;
  levels: string[];
  collections: {
    name: string;
    kind: 'LESSON' | 'TOPIC';
    level?: string;
  }[];
  words: SeedWord[];
}

export const SEED: SeedLanguage[] = [
  {
    name: 'Japanese',
    code: 'ja',
    levelSystem: 'JLPT',
    levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
    collections: [
      { name: 'Lesson 1', kind: 'LESSON', level: 'N5' },
      { name: 'Lesson 3', kind: 'LESSON', level: 'N5' },
      { name: 'Food', kind: 'TOPIC' },
      { name: 'Daily Conversation', kind: 'TOPIC' },
    ],
    words: [
      { term: '食べる', meaning: 'ăn', reading: 'たべる', romanization: 'taberu', example: '毎日ご飯を食べます。', exampleTranslation: 'Tôi ăn cơm mỗi ngày.', level: 'N5', collections: ['Lesson 3', 'Food', 'Daily Conversation'] },
      { term: '飲む', meaning: 'uống', reading: 'のむ', romanization: 'nomu', example: '水を飲みます。', exampleTranslation: 'Tôi uống nước.', level: 'N5', collections: ['Lesson 3', 'Food'] },
      { term: '水', meaning: 'nước', reading: 'みず', romanization: 'mizu', level: 'N5', collections: ['Lesson 3', 'Food'] },
      { term: 'ご飯', meaning: 'cơm; bữa ăn', reading: 'ごはん', romanization: 'gohan', level: 'N5', collections: ['Food'] },
      { term: '魚', meaning: 'cá', reading: 'さかな', romanization: 'sakana', level: 'N5', collections: ['Food'] },
      { term: 'こんにちは', meaning: 'xin chào (ban ngày)', romanization: 'konnichiwa', level: 'N5', collections: ['Lesson 1', 'Daily Conversation'] },
      { term: 'ありがとう', meaning: 'cảm ơn', romanization: 'arigatou', level: 'N5', collections: ['Lesson 1', 'Daily Conversation'] },
      { term: '私', meaning: 'tôi', reading: 'わたし', romanization: 'watashi', level: 'N5', collections: ['Lesson 1'] },
      { term: '学生', meaning: 'học sinh, sinh viên', reading: 'がくせい', romanization: 'gakusei', level: 'N5', collections: ['Lesson 1'] },
      { term: '先生', meaning: 'giáo viên', reading: 'せんせい', romanization: 'sensei', level: 'N5', collections: ['Lesson 1'] },
      { term: '行く', meaning: 'đi', reading: 'いく', romanization: 'iku', example: '学校に行きます。', exampleTranslation: 'Tôi đi đến trường.', level: 'N5', collections: ['Lesson 3'] },
      { term: '経験', meaning: 'kinh nghiệm', reading: 'けいけん', romanization: 'keiken', level: 'N4', collections: [] },
    ],
  },
  {
    name: 'Chinese',
    code: 'zh',
    levelSystem: 'HSK',
    levels: ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'],
    collections: [
      { name: 'Lesson 1', kind: 'LESSON', level: 'HSK 1' },
      { name: 'Lesson 2', kind: 'LESSON', level: 'HSK 1' },
      { name: 'Food', kind: 'TOPIC' },
    ],
    words: [
      { term: '你好', meaning: 'xin chào', reading: 'nǐ hǎo', romanization: 'ni hao', level: 'HSK 1', collections: ['Lesson 1'] },
      { term: '谢谢', meaning: 'cảm ơn', reading: 'xièxie', romanization: 'xiexie', level: 'HSK 1', collections: ['Lesson 1'] },
      { term: '我', meaning: 'tôi', reading: 'wǒ', romanization: 'wo', level: 'HSK 1', collections: ['Lesson 1'] },
      { term: '老师', meaning: 'giáo viên', reading: 'lǎoshī', romanization: 'laoshi', level: 'HSK 1', collections: ['Lesson 1'] },
      { term: '吃', meaning: 'ăn', reading: 'chī', romanization: 'chi', example: '我吃米饭。', exampleTranslation: 'Tôi ăn cơm.', level: 'HSK 1', collections: ['Lesson 2', 'Food'] },
      { term: '喝', meaning: 'uống', reading: 'hē', romanization: 'he', example: '我喝水。', exampleTranslation: 'Tôi uống nước.', level: 'HSK 1', collections: ['Lesson 2', 'Food'] },
      { term: '水', meaning: 'nước', reading: 'shuǐ', romanization: 'shui', level: 'HSK 1', collections: ['Lesson 2', 'Food'] },
      { term: '米饭', meaning: 'cơm', reading: 'mǐfàn', romanization: 'mifan', level: 'HSK 1', collections: ['Food'] },
      // Hai dòng cùng mặt chữ, khác âm đọc và nghĩa — lý do KHÔNG đặt unique trên (languageId, term).
      { term: '行', meaning: 'đi; được, ổn', reading: 'xíng', romanization: 'xing', level: 'HSK 2', collections: [] },
      { term: '行', meaning: 'hàng, dòng; ngành nghề', reading: 'háng', romanization: 'hang', level: 'HSK 3', collections: [] },
    ],
  },
  {
    name: 'English',
    code: 'en',
    levelSystem: 'CEFR',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    collections: [
      { name: 'Unit 1', kind: 'LESSON', level: 'B1' },
      { name: 'Work', kind: 'TOPIC' },
      { name: 'Food', kind: 'TOPIC' },
    ],
    words: [
      { term: 'appointment', meaning: 'cuộc hẹn', reading: '/əˈpɔɪntmənt/', example: 'I have a doctor’s appointment at 3.', exampleTranslation: 'Tôi có hẹn với bác sĩ lúc 3 giờ.', level: 'B1', collections: ['Unit 1', 'Work'] },
      { term: 'deadline', meaning: 'hạn chót', reading: '/ˈdedlaɪn/', level: 'B1', collections: ['Unit 1', 'Work'] },
      { term: 'colleague', meaning: 'đồng nghiệp', reading: '/ˈkɒliːɡ/', level: 'B1', collections: ['Work'] },
      { term: 'negotiate', meaning: 'đàm phán', reading: '/nɪˈɡəʊʃieɪt/', level: 'B2', collections: ['Work'] },
      { term: 'ingredient', meaning: 'nguyên liệu', reading: '/ɪnˈɡriːdiənt/', level: 'B1', collections: ['Food'] },
      { term: 'recipe', meaning: 'công thức nấu ăn', reading: '/ˈresəpi/', level: 'B1', collections: ['Unit 1', 'Food'] },
      { term: 'bank', meaning: 'ngân hàng', reading: '/bæŋk/', level: 'A2', collections: ['Work'] },
      { term: 'bank', meaning: 'bờ sông', reading: '/bæŋk/', level: 'B1', collections: [] },
    ],
  },
];
