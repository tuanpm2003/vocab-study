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

describe('applyReview — chuỗi đúng liên tiếp (ADR-010)', () => {
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

describe('applyReview — lịch ôn SM-2 (ADR-012)', () => {
  it('GOOD ba lần: khoảng cách 1 → 6 → 15 ngày', () => {
    const intervals: number[] = [];
    let state = INITIAL_PROGRESS;
    for (let i = 0; i < 3; i++) {
      state = applyReview(state, good);
      intervals.push(state.intervalDays);
    }
    expect(intervals).toEqual([1, 6, 15]);
    expect(state.repetitions).toBe(3);
  });

  it('quiz đúng xếp lịch như GOOD; quiz sai xếp lịch như AGAIN', () => {
    const base = replay([good, good]);
    const pick = (p: ProgressSnapshot) => ({
      easeFactor: p.easeFactor,
      intervalDays: p.intervalDays,
      repetitions: p.repetitions,
    });

    expect(pick(applyReview(base, right))).toEqual(
      pick(applyReview(base, good)),
    );
    expect(pick(applyReview(base, wrong))).toEqual(
      pick(applyReview(base, again)),
    );
  });

  it('quên: đến hạn ngay (0 ngày) và hệ số dễ giảm', () => {
    const result = applyReview(replay([good, good, good]), again);
    expect(result).toMatchObject({ intervalDays: 0, repetitions: 0 });
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it('flashcard và quiz dùng chung một lịch ôn', () => {
    const result = replay([good, right, good]);
    expect(result).toMatchObject({ intervalDays: 15, repetitions: 3 });
  });
});

describe('applyReview — trạng thái suy từ lịch ôn', () => {
  it('lần ôn đầu tiên luôn rời NEW', () => {
    for (const input of [again, hard, good, easy, wrong, right]) {
      expect(applyReview(INITIAL_PROGRESS, input).status).not.toBe('NEW');
    }
  });

  it('sai ngay lần đầu → LEARNING; đúng ngay lần đầu → REVIEW', () => {
    expect(applyReview(INITIAL_PROGRESS, again).status).toBe('LEARNING');
    expect(applyReview(INITIAL_PROGRESS, wrong).status).toBe('LEARNING');
    expect(applyReview(INITIAL_PROGRESS, good).status).toBe('REVIEW');
    expect(applyReview(INITIAL_PROGRESS, right).status).toBe('REVIEW');
  });

  it('GOOD liên tục: MASTERED khi khoảng cách vượt 21 ngày (lần thứ tư, 38 ngày)', () => {
    const statuses: LearningStatus[] = [];
    let state = INITIAL_PROGRESS;
    for (let i = 0; i < 4; i++) {
      state = applyReview(state, good);
      statuses.push(state.status);
    }
    expect(statuses).toEqual(['REVIEW', 'REVIEW', 'REVIEW', 'MASTERED']);
  });

  it('năm lần đúng trong năm phút KHÔNG còn đủ để MASTERED nếu khoảng cách chưa tới 21 ngày', () => {
    // Điểm yếu của ADR-010 mà ADR-012 sửa: HARD liên tục giãn rất chậm.
    const result = replay([hard, hard, hard]);
    expect(result.intervalDays).toBeLessThan(21);
    expect(result.status).toBe('REVIEW');
  });

  it.each<LearningStatus>(['REVIEW', 'MASTERED'])(
    'đang %s mà quên → LEARNING',
    (status) => {
      const before = progress({
        status,
        easeFactor: 2.5,
        intervalDays: 40,
        repetitions: 4,
      });
      expect(applyReview(before, again).status).toBe('LEARNING');
      expect(applyReview(before, wrong).status).toBe('LEARNING');
    },
  );

  it('sau khi quên phải đi lại từ đầu: LEARNING → REVIEW (1 ngày) → REVIEW (6 ngày)', () => {
    const forgotten = applyReview(replay([good, good, good, good]), again);
    const first = applyReview(forgotten, good);
    const second = applyReview(first, good);

    expect([forgotten.status, first.status, second.status]).toEqual([
      'LEARNING',
      'REVIEW',
      'REVIEW',
    ]);
    expect([first.intervalDays, second.intervalDays]).toEqual([1, 6]);
  });

  it('dòng tiến độ cũ (trước Phase 11, chưa có lịch ôn) được xếp lịch từ lần ôn kế tiếp', () => {
    const legacy = progress({
      status: 'MASTERED',
      reviewCount: 9,
      correctCount: 9,
      correctStreak: 9,
    });

    const result = applyReview(legacy, good);

    expect(result).toMatchObject({
      status: 'REVIEW',
      intervalDays: 1,
      repetitions: 1,
      reviewCount: 10,
    });
  });
});
