import {
  countStreak,
  dayRange,
  isValidTimeZone,
  localDateKey,
} from './time-zone.js';

const VN = 'Asia/Ho_Chi_Minh';
const NY = 'America/New_York';
const utc = (iso: string) => new Date(`${iso}Z`);

describe('isValidTimeZone', () => {
  it.each([VN, NY, 'UTC', 'Europe/Berlin'])('%s hợp lệ', (zone) => {
    expect(isValidTimeZone(zone)).toBe(true);
  });

  it.each(['Asia/Sai_Gon_Khong_Co', 'GMT+7 Vietnam', ''])(
    '"%s" không hợp lệ',
    (zone) => {
      expect(isValidTimeZone(zone)).toBe(false);
    },
  );
});

describe('localDateKey', () => {
  it('23:59 UTC ngày 5 đã là ngày 6 ở Việt Nam', () => {
    expect(localDateKey(utc('2026-10-05T23:59:00'), VN)).toBe('2026-10-06');
    expect(localDateKey(utc('2026-10-05T23:59:00'), 'UTC')).toBe('2026-10-05');
  });

  it('16:59 UTC vẫn là ngày đó ở Việt Nam; 17:00 UTC là ngày hôm sau', () => {
    expect(localDateKey(utc('2026-10-06T16:59:59'), VN)).toBe('2026-10-06');
    expect(localDateKey(utc('2026-10-06T17:00:00'), VN)).toBe('2026-10-07');
  });

  it('đệm số 0 cho tháng và ngày một chữ số', () => {
    expect(localDateKey(utc('2026-01-05T05:00:00'), VN)).toBe('2026-01-05');
  });
});

describe('dayRange', () => {
  it('Việt Nam: "hôm nay" bắt đầu lúc 17:00 UTC hôm trước, dài đúng 24 giờ', () => {
    const { start, end } = dayRange(utc('2026-10-06T03:00:00'), VN);

    expect(start.toISOString()).toBe('2026-10-05T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-06T17:00:00.000Z');
  });

  it('ôn lúc 6:59 sáng và 7:00 sáng giờ Việt Nam đều thuộc CÙNG một ngày', () => {
    // 6:59 VN = 23:59 UTC hôm trước; 7:00 VN = 00:00 UTC. Cắt theo UTC sẽ tách chúng ra hai ngày.
    const at0659 = utc('2026-10-05T23:59:00');
    const at0700 = utc('2026-10-06T00:00:00');

    expect(dayRange(at0659, VN)).toEqual(dayRange(at0700, VN));
    const { start, end } = dayRange(at0700, VN);
    for (const instant of [at0659, at0700]) {
      expect(instant.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(instant.getTime()).toBeLessThan(end.getTime());
    }
  });

  it('ranh giới nửa đêm Việt Nam: 23:59:59 thuộc hôm nay, 00:00:00 thuộc ngày mai', () => {
    const lastSecond = utc('2026-10-06T16:59:59');
    const midnight = utc('2026-10-06T17:00:00');

    expect(dayRange(lastSecond, VN).end.toISOString()).toBe(
      '2026-10-06T17:00:00.000Z',
    );
    expect(dayRange(midnight, VN).start.toISOString()).toBe(
      '2026-10-06T17:00:00.000Z',
    );
  });

  it('end của hôm nay chính là start của ngày mai (không hở, không chồng)', () => {
    const today = dayRange(utc('2026-10-06T10:00:00'), VN);
    const tomorrow = dayRange(utc('2026-10-07T10:00:00'), VN);
    expect(today.end).toEqual(tomorrow.start);
  });

  it('cuối tháng và cuối năm', () => {
    expect(dayRange(utc('2026-10-31T10:00:00'), VN).end.toISOString()).toBe(
      '2026-10-31T17:00:00.000Z',
    );
    expect(dayRange(utc('2026-12-31T18:00:00'), VN)).toEqual({
      start: utc('2026-12-31T17:00:00'),
      end: utc('2027-01-01T17:00:00'),
    });
  });

  it('UTC: cắt đúng 00:00', () => {
    expect(dayRange(utc('2026-10-06T12:34:56'), 'UTC')).toEqual({
      start: utc('2026-10-06T00:00:00'),
      end: utc('2026-10-07T00:00:00'),
    });
  });

  describe('múi giờ có DST (America/New_York)', () => {
    it('ngày thường mùa đông: UTC-5', () => {
      expect(dayRange(utc('2026-01-15T15:00:00'), NY)).toEqual({
        start: utc('2026-01-15T05:00:00'),
        end: utc('2026-01-16T05:00:00'),
      });
    });

    it('ngày vặn đồng hồ lên (8/3/2026) chỉ dài 23 giờ', () => {
      const { start, end } = dayRange(utc('2026-03-08T15:00:00'), NY);
      expect(start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
      expect(end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
      expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
    });

    it('ngày vặn đồng hồ lùi (1/11/2026) dài 25 giờ', () => {
      const { start, end } = dayRange(utc('2026-11-01T15:00:00'), NY);
      expect(start.toISOString()).toBe('2026-11-01T04:00:00.000Z');
      expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
    });
  });
});

describe('countStreak', () => {
  const TODAY = '2026-10-06';

  it('chưa học ngày nào → 0', () => {
    expect(countStreak([], TODAY)).toBe(0);
  });

  it('chỉ học hôm nay → 1', () => {
    expect(countStreak([TODAY], TODAY)).toBe(1);
  });

  it('học liên tục 3 ngày tính tới hôm nay → 3', () => {
    expect(countStreak(['2026-10-06', '2026-10-05', '2026-10-04'], TODAY)).toBe(
      3,
    );
  });

  it('hôm nay chưa học nhưng hôm qua có → chuỗi vẫn sống', () => {
    expect(countStreak(['2026-10-05', '2026-10-04'], TODAY)).toBe(2);
  });

  it('bỏ trọn hôm qua → chuỗi đứt', () => {
    expect(countStreak(['2026-10-04', '2026-10-03'], TODAY)).toBe(0);
  });

  it('lỗ hổng giữa chừng cắt chuỗi tại đó', () => {
    expect(
      countStreak(
        ['2026-10-06', '2026-10-05', '2026-10-03', '2026-10-02'],
        TODAY,
      ),
    ).toBe(2);
  });

  it('không phụ thuộc thứ tự và ngày trùng lặp', () => {
    expect(
      countStreak(
        ['2026-10-04', '2026-10-06', '2026-10-05', '2026-10-06'],
        TODAY,
      ),
    ).toBe(3);
  });

  it('chuỗi vắt qua ranh giới tháng và năm', () => {
    expect(
      countStreak(['2026-10-01', '2026-09-30', '2026-09-29'], '2026-10-01'),
    ).toBe(3);
    expect(countStreak(['2027-01-01', '2026-12-31'], '2027-01-01')).toBe(2);
  });
});
