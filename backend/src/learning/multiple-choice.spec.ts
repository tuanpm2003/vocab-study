import {
  buildQuestion,
  normalize,
  shuffle,
  type ChoiceSource,
  type QuestionType,
} from './multiple-choice.js';

/** Nguồn "ngẫu nhiên" xác định: lặp lại dãy cho trước. */
function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] as number;
}

/** random() luôn gần 1 → Fisher–Yates hoán đổi mỗi phần tử với chính nó → giữ nguyên thứ tự. */
const keepOrder = () => 0.999;

const word = (id: string, term: string, meaning: string): ChoiceSource => ({
  id,
  term,
  meaning,
});

const taberu = word('1', '食べる', 'ăn');
const nomu = word('2', '飲む', 'uống');
const iku = word('3', '行く', 'đi');
const mizu = word('4', '水', 'nước');
const sakana = word('5', '魚', 'cá');
const POOL = [taberu, nomu, iku, mizu, sakana];

describe('normalize', () => {
  it('bỏ khoảng trắng đầu cuối và không phân biệt hoa thường', () => {
    expect(normalize('  Ăn ')).toBe('ăn');
    expect(normalize('BANK')).toBe(normalize('bank'));
  });
});

describe('shuffle', () => {
  it('không sửa mảng gốc và giữ nguyên tập phần tử', () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original, sequence(0.1, 0.7, 0.3, 0.9));
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('nguồn ngẫu nhiên khác nhau cho thứ tự khác nhau', () => {
    const items = [1, 2, 3, 4, 5];
    expect(shuffle(items, () => 0)).not.toEqual(shuffle(items, keepOrder));
  });

  it('mảng rỗng và mảng một phần tử', () => {
    expect(shuffle([], Math.random)).toEqual([]);
    expect(shuffle(['a'], Math.random)).toEqual(['a']);
  });
});

describe('buildQuestion', () => {
  describe.each<[QuestionType, string, string, string[]]>([
    ['term_to_meaning', '食べる', 'ăn', ['uống', 'đi', 'nước', 'cá']],
    ['meaning_to_term', 'ăn', '食べる', ['飲む', '行く', '水', '魚']],
  ])('%s', (type, prompt, correct, possibleDistractors) => {
    it('prompt đúng chiều, 4 lựa chọn khác nhau, correctIndex trỏ đúng đáp án', () => {
      const question = buildQuestion(taberu, POOL, type);

      expect(question).not.toBeNull();
      expect(question?.questionType).toBe(type);
      expect(question?.prompt).toBe(prompt);
      expect(question?.choices).toHaveLength(4);
      expect(new Set(question?.choices).size).toBe(4);
      expect(question?.choices[question.correctIndex]).toBe(correct);
      for (const choice of question?.choices ?? []) {
        expect([correct, ...possibleDistractors]).toContain(choice);
      }
    });
  });

  it('không bao giờ lấy chính từ đang hỏi làm đáp án nhiễu', () => {
    for (let i = 0; i < 50; i++) {
      const question = buildQuestion(taberu, POOL, 'term_to_meaning');
      expect(question?.choices.filter((c) => c === 'ăn')).toHaveLength(1);
    }
  });

  it('vị trí đáp án đúng thay đổi theo nguồn ngẫu nhiên', () => {
    const positions = new Set<number>();
    for (let i = 0; i < 100; i++) {
      positions.add(
        buildQuestion(taberu, POOL, 'term_to_meaning')?.correctIndex ?? -1,
      );
    }
    expect(positions.size).toBeGreaterThan(1);
    expect(positions.has(-1)).toBe(false);
  });

  it('kết quả xác định khi nguồn ngẫu nhiên xác định', () => {
    const a = buildQuestion(
      taberu,
      POOL,
      'term_to_meaning',
      sequence(0.2, 0.8),
    );
    const b = buildQuestion(
      taberu,
      POOL,
      'term_to_meaning',
      sequence(0.2, 0.8),
    );
    expect(a).toEqual(b);
  });

  describe('ít từ', () => {
    it('pool rỗng → null', () => {
      expect(buildQuestion(taberu, [], 'term_to_meaning')).toBeNull();
    });

    it('pool chỉ có chính nó → null', () => {
      expect(buildQuestion(taberu, [taberu], 'term_to_meaning')).toBeNull();
    });

    it('chỉ 3 từ (2 đáp án nhiễu) → null', () => {
      expect(
        buildQuestion(taberu, [taberu, nomu, iku], 'term_to_meaning'),
      ).toBeNull();
    });

    it('đúng 4 từ → đủ, dùng hết cả 3 từ còn lại', () => {
      const question = buildQuestion(
        taberu,
        [taberu, nomu, iku, mizu],
        'term_to_meaning',
      );
      expect([...(question?.choices ?? [])].sort()).toEqual(
        ['ăn', 'uống', 'đi', 'nước'].sort(),
      );
    });

    it('target không nằm trong pool vẫn dựng được', () => {
      const question = buildQuestion(
        taberu,
        [nomu, iku, mizu],
        'term_to_meaning',
      );
      expect(question?.choices).toHaveLength(4);
    });
  });

  describe('trùng nghĩa / trùng mặt chữ', () => {
    it('từ trùng NGHĨA với target bị loại (kể cả khác hoa thường, thừa dấu cách)', () => {
      const synonym = word('9', '食う', ' ĂN ');
      const pool = [taberu, synonym, nomu, iku, mizu];

      for (const type of ['term_to_meaning', 'meaning_to_term'] as const) {
        const question = buildQuestion(taberu, pool, type, keepOrder);
        expect(question?.choices).not.toContain(' ĂN ');
        expect(question?.choices).not.toContain('食う');
        expect(question?.choices).toHaveLength(4);
      }
    });

    it('từ đồng tự (cùng mặt chữ, khác nghĩa) bị loại: nghĩa của nó cũng là đáp án đúng', () => {
      const xing = word('a', '行', 'đi');
      const hang = word('b', '行', 'hàng, dòng');
      const pool = [xing, hang, nomu, mizu, sakana];

      const question = buildQuestion(xing, pool, 'term_to_meaning', keepOrder);

      expect(question?.choices).not.toContain('hàng, dòng');
      expect(question?.choices).toHaveLength(4);
    });

    it('loại xong mà không còn đủ 3 → null', () => {
      const synonym = word('9', '食う', 'ăn');
      expect(
        buildQuestion(taberu, [taberu, synonym, nomu, iku], 'term_to_meaning'),
      ).toBeNull();
    });

    it('hai đáp án nhiễu trùng nhau chỉ được tính một', () => {
      const drink1 = word('2', '飲む', 'uống');
      const drink2 = word('8', '飲み物を飲む', 'Uống');
      const pool = [taberu, drink1, drink2, iku, mizu];

      const question = buildQuestion(
        taberu,
        pool,
        'term_to_meaning',
        keepOrder,
      );

      const normalized = question?.choices.map(normalize) ?? [];
      expect(new Set(normalized).size).toBe(4);
    });

    it('đáp án nhiễu trùng nhau làm thiếu lựa chọn → null', () => {
      const drink1 = word('2', '飲む', 'uống');
      const drink2 = word('8', '飲み物を飲む', 'uống');
      expect(
        buildQuestion(taberu, [taberu, drink1, drink2, iku], 'term_to_meaning'),
      ).toBeNull();
    });

    it('chiều meaning_to_term: hai từ khác nghĩa nhưng cùng mặt chữ chỉ tính một lựa chọn', () => {
      const bank1 = word('x', 'bank', 'ngân hàng');
      const bank2 = word('y', 'bank', 'bờ sông');
      const pool = [taberu, bank1, bank2, nomu, iku];

      const question = buildQuestion(
        taberu,
        pool,
        'meaning_to_term',
        keepOrder,
      );

      expect(question?.choices.filter((c) => c === 'bank')).toHaveLength(1);
      expect(question?.choices).toHaveLength(4);
    });
  });
});
