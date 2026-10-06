import type { LearningStatus } from '../generated/prisma/enums.js';
import {
  applyReview,
  INITIAL_PROGRESS,
  isCorrectReview,
  type ProgressSnapshot,
  type ReviewInput,
} from './progress-rules.js';

function progress(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return { ...INITIAL_PROGRESS, ...overrides };
}

function replay(inputs: ReviewInput[], start = INITIAL_PROGRESS) {
  return inputs.reduce(applyReview, start);
}

const good: ReviewInput = { rating: 'GOOD' };
const again: ReviewInput = { rating: 'AGAIN' };
const hard: ReviewInput = { rating: 'HARD' };
const easy: ReviewInput = { rating: 'EASY' };
const right: ReviewInput = { isCorrect: true };
const wrong: ReviewInput = { isCorrect: false };

describe('isCorrectReview', () => {
  it.each<[ReviewInput, boolean]>([
    [again, false],
    [hard, true],
    [good, true],
    [easy, true],
    [right, true],
    [wrong, false],
  ])('%j → %s', (input, expected) => {
    expect(isCorrectReview(input)).toBe(expected);
  });
});

describe('applyReview — bộ đếm', () => {
  it('trả lời đúng: reviewCount +1, correctCount +1, incorrectCount giữ nguyên', () => {
    const result = applyReview(
      progress({ reviewCount: 4, correctCount: 3, incorrectCount: 1 }),
      right,
    );
    expect(result).toMatchObject({
      reviewCount: 5,
      correctCount: 4,
      incorrectCount: 1,
    });
  });

  it('trả lời sai: reviewCount +1, incorrectCount +1, correctCount giữ nguyên', () => {
    const result = applyReview(
      progress({ reviewCount: 4, correctCount: 3, incorrectCount: 1 }),
      wrong,
    );
    expect(result).toMatchObject({
      reviewCount: 5,
      correctCount: 3,
      incorrectCount: 2,
    });
  });

  it('không sửa object đầu vào', () => {
    const before = progress({ correctStreak: 1 });
    applyReview(before, good);
    expect(before).toEqual(progress({ correctStreak: 1 }));
  });

  it('reviewCount luôn bằng correctCount + incorrectCount qua một chuỗi bất kỳ', () => {
    const result = replay([good, again, hard, easy, wrong, right, again]);
    expect(result.reviewCount).toBe(7);
    expect(result.correctCount + result.incorrectCount).toBe(7);
  });
});

describe('applyReview — chuỗi đúng liên tiếp', () => {
  it.each<[string, ReviewInput, number]>([
    ['AGAIN về 0', again, 0],
    ['HARD giữ nguyên', hard, 3],
    ['GOOD +1', good, 4],
    ['EASY +2', easy, 5],
    ['quiz đúng +1', right, 4],
    ['quiz sai về 0', wrong, 0],
  ])('%s', (_label, input, expected) => {
    expect(
      applyReview(progress({ correctStreak: 3 }), input).correctStreak,
    ).toBe(expected);
  });
});

describe('applyReview — chuyển trạng thái', () => {
  it('lần ôn đầu tiên luôn rời NEW, dù đúng hay sai', () => {
    for (const input of [again, hard, good, wrong, right]) {
      expect(applyReview(INITIAL_PROGRESS, input).status).toBe('LEARNING');
    }
  });

  it('EASY ngay lần đầu: chuỗi 2 → thẳng lên REVIEW', () => {
    expect(applyReview(INITIAL_PROGRESS, easy).status).toBe('REVIEW');
  });

  it('NEW → LEARNING → REVIEW → MASTERED theo chuỗi 1 / 2 / 5', () => {
    const statuses: LearningStatus[] = [];
    let state = INITIAL_PROGRESS;
    for (let i = 0; i < 6; i++) {
      state = applyReview(state, good);
      statuses.push(state.status);
    }
    expect(statuses).toEqual([
      'LEARNING', // chuỗi 1
      'REVIEW', // chuỗi 2
      'REVIEW',
      'REVIEW',
      'MASTERED', // chuỗi 5
      'MASTERED',
    ]);
  });

  it('HARD lặp lại không bao giờ thăng cấp (chuỗi không tăng)', () => {
    const result = replay([hard, hard, hard, hard, hard, hard]);
    expect(result).toMatchObject({ status: 'LEARNING', correctStreak: 0 });
  });

  it.each<[LearningStatus, LearningStatus]>([
    ['NEW', 'LEARNING'],
    ['LEARNING', 'LEARNING'],
    ['REVIEW', 'LEARNING'],
    ['MASTERED', 'REVIEW'],
  ])('sai khi đang %s → %s (tụt đúng một bậc)', (from, to) => {
    for (const input of [again, wrong]) {
      const result = applyReview(
        progress({ status: from, correctStreak: 7 }),
        input,
      );
      expect(result.status).toBe(to);
      expect(result.correctStreak).toBe(0);
    }
  });

  it('trả lời đúng không bao giờ làm tụt bậc: MASTERED vừa bị hạ xuống REVIEW, đúng 1 lần vẫn là REVIEW', () => {
    const demoted = applyReview(
      progress({ status: 'MASTERED', correctStreak: 9 }),
      again,
    );
    expect(demoted.status).toBe('REVIEW');

    const afterOneCorrect = applyReview(demoted, good);
    expect(afterOneCorrect).toMatchObject({
      status: 'REVIEW',
      correctStreak: 1,
    });
  });

  it('sau khi bị hạ từ MASTERED, phải đúng đủ 5 lần liền mới lên lại', () => {
    const demoted = applyReview(
      progress({ status: 'MASTERED', correctStreak: 9 }),
      wrong,
    );
    expect(replay([right, right, right, right], demoted).status).toBe('REVIEW');
    expect(replay([right, right, right, right, right], demoted).status).toBe(
      'MASTERED',
    );
  });

  it('sai giữa chừng làm chuỗi phải đếm lại từ đầu', () => {
    const result = replay([good, good, good, good, again, good]);
    expect(result).toMatchObject({ status: 'LEARNING', correctStreak: 1 });
  });

  it('flashcard và quiz dùng chung một tiến độ', () => {
    const result = replay([good, right, good, right, good]);
    expect(result).toMatchObject({ status: 'MASTERED', correctStreak: 5 });
  });
});
