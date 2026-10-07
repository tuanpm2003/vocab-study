import {
  INITIAL_SRS,
  MAX_INTERVAL_DAYS,
  MIN_EASE_FACTOR,
  previewIntervals,
  qualityOfAnswer,
  qualityOfRating,
  schedule,
  statusFor,
  type Quality,
  type SrsState,
} from './srs.js';

function replay(qualities: Quality[], start: SrsState = INITIAL_SRS) {
  return qualities.reduce(schedule, start);
}

describe('quy đổi sang điểm chất lượng', () => {
  it('AGAIN=1, HARD=3, GOOD=4, EASY=5', () => {
    expect(qualityOfRating('AGAIN')).toBe(1);
    expect(qualityOfRating('HARD')).toBe(3);
    expect(qualityOfRating('GOOD')).toBe(4);
    expect(qualityOfRating('EASY')).toBe(5);
  });

  it('quiz đúng tính như GOOD, sai tính như AGAIN', () => {
    expect(qualityOfAnswer(true)).toBe(qualityOfRating('GOOD'));
    expect(qualityOfAnswer(false)).toBe(qualityOfRating('AGAIN'));
  });
});

describe('schedule — khoảng cách ôn', () => {
  it('lần đúng đầu tiên → 1 ngày, lần thứ hai → 6 ngày', () => {
    const first = schedule(INITIAL_SRS, 4);
    expect(first).toMatchObject({ intervalDays: 1, repetitions: 1 });

    const second = schedule(first, 4);
    expect(second).toMatchObject({ intervalDays: 6, repetitions: 2 });
  });

  it('GOOD liên tục: 1 → 6 → 15 → 38 → 95 ngày (ease giữ 2.5)', () => {
    const intervals: number[] = [];
    let state = INITIAL_SRS;
    for (let i = 0; i < 5; i++) {
      state = schedule(state, 4);
      intervals.push(state.intervalDays);
    }
    expect(intervals).toEqual([1, 6, 15, 38, 95]);
    expect(state.easeFactor).toBe(2.5);
  });

  it('quên → về 0 ngày (đến hạn ngay), repetitions về 0, dù trước đó đã rất xa', () => {
    const mature = replay([4, 4, 4, 4]);
    expect(mature.intervalDays).toBe(38);

    const forgotten = schedule(mature, 1);

    expect(forgotten).toMatchObject({ intervalDays: 0, repetitions: 0 });
  });

  it('sau khi quên, học lại bắt đầu từ 1 → 6 ngày nhưng với ease đã giảm', () => {
    const forgotten = schedule(replay([4, 4, 4]), 1);
    const relearned = replay([4, 4, 4], forgotten);

    expect(forgotten.easeFactor).toBeLessThan(2.5);
    expect(relearned.repetitions).toBe(3);
    // lần thứ ba = 6 × ease (đã giảm) < 15
    expect(relearned.intervalDays).toBeLessThan(15);
    expect(relearned.intervalDays).toBeGreaterThan(6);
  });

  it('EASY giãn nhanh hơn GOOD, HARD giãn chậm hơn GOOD', () => {
    const base = replay([4, 4]);
    const hard = schedule(base, 3).intervalDays;
    const good = schedule(base, 4).intervalDays;
    const easy = schedule(base, 5).intervalDays;

    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it('khoảng cách không bao giờ vượt trần 365 ngày', () => {
    const far = replay([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(far.intervalDays).toBe(MAX_INTERVAL_DAYS);
    expect(schedule(far, 5).intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  it('trả lời được thì khoảng cách luôn ít nhất 1 ngày', () => {
    const weird: SrsState = {
      easeFactor: 1.3,
      intervalDays: 0,
      repetitions: 5,
    };
    expect(schedule(weird, 3).intervalDays).toBe(1);
  });

  it('không sửa object đầu vào', () => {
    const before = { ...INITIAL_SRS };
    schedule(before, 4);
    expect(before).toEqual(INITIAL_SRS);
  });
});

describe('schedule — hệ số dễ (easeFactor)', () => {
  it.each<[Quality, number]>([
    [5, 2.6],
    [4, 2.5],
    [3, 2.36],
    [1, 1.96],
  ])('q=%i: 2.5 → %f', (quality, expected) => {
    expect(schedule(INITIAL_SRS, quality).easeFactor).toBe(expected);
  });

  it('quên liên tục: ease giảm dần nhưng dừng ở sàn 1.3', () => {
    const state = replay([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(state.easeFactor).toBe(MIN_EASE_FACTOR);
    expect(schedule(state, 1).easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it('HARD liên tục cũng không kéo ease xuống dưới sàn', () => {
    const state = replay(Array<Quality>(20).fill(3));
    expect(state.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it('không tích lũy sai số số thực qua nhiều lần ôn', () => {
    const state = replay(Array<Quality>(30).fill(4));
    expect(state.easeFactor).toBe(2.5);
  });
});

describe('statusFor', () => {
  it.each<[string, SrsState, string]>([
    [
      'vừa quên',
      { easeFactor: 2.5, intervalDays: 0, repetitions: 0 },
      'LEARNING',
    ],
    [
      'đúng lần đầu (1 ngày)',
      { easeFactor: 2.5, intervalDays: 1, repetitions: 1 },
      'REVIEW',
    ],
    [
      '20 ngày',
      { easeFactor: 2.5, intervalDays: 20, repetitions: 3 },
      'REVIEW',
    ],
    [
      'đúng 21 ngày',
      { easeFactor: 2.5, intervalDays: 21, repetitions: 3 },
      'MASTERED',
    ],
    [
      '365 ngày',
      { easeFactor: 2.5, intervalDays: 365, repetitions: 9 },
      'MASTERED',
    ],
  ])('%s → %s', (_label, state, expected) => {
    expect(statusFor(state)).toBe(expected);
  });

  it('GOOD liên tục: REVIEW, REVIEW, REVIEW, rồi MASTERED ở lần thứ tư (38 ngày)', () => {
    const statuses: string[] = [];
    let state = INITIAL_SRS;
    for (let i = 0; i < 4; i++) {
      state = schedule(state, 4);
      statuses.push(statusFor(state));
    }
    expect(statuses).toEqual(['REVIEW', 'REVIEW', 'REVIEW', 'MASTERED']);
  });

  it('từ đã MASTERED mà quên → LEARNING', () => {
    expect(statusFor(schedule(replay([4, 4, 4, 4]), 1))).toBe('LEARNING');
  });
});

describe('previewIntervals', () => {
  it('từ mới: Quên 0, Khó 1, Được 1, Dễ 1 ngày', () => {
    expect(previewIntervals(INITIAL_SRS)).toEqual({
      AGAIN: 0,
      HARD: 1,
      GOOD: 1,
      EASY: 1,
    });
  });

  it('khớp đúng với kết quả schedule() của từng mức', () => {
    const state = replay([4, 4, 4]);
    const preview = previewIntervals(state);

    expect(preview.AGAIN).toBe(0);
    expect(preview.HARD).toBe(schedule(state, 3).intervalDays);
    expect(preview.GOOD).toBe(schedule(state, 4).intervalDays);
    expect(preview.EASY).toBe(schedule(state, 5).intervalDays);
  });
});
