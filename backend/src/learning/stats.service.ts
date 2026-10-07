import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { whereDue } from '../vocabularies/vocabularies.service.js';
import { countStreak, dayRange, localDateKey } from './time-zone.js';

// Chuỗi ngày học dài hơn thế này thì hiển thị đúng con số cũng không còn quan trọng.
const STREAK_LOOKBACK_DAYS = 400;

/**
 * Cột reviewedAt là `timestamp` KHÔNG kèm múi giờ và chứa giờ UTC. Truyền mốc so sánh dưới
 * dạng chuỗi UTC rồi ép `::timestamp` để phép so sánh không phụ thuộc múi giờ của phiên
 * kết nối Postgres (truyền thẳng Date sẽ thành timestamptz và bị quy đổi theo phiên).
 */
function toSqlTimestamp(instant: Date): string {
  return instant.toISOString().replace('T', ' ').replace('Z', '');
}

export interface ReviewTally {
  reviewed: number;
  correct: number;
  incorrect: number;
}

export interface StatsResponse {
  today: ReviewTally & {
    /** correct / reviewed, 0..1. `null` khi hôm nay chưa ôn từ nào (ADR-011). */
    accuracy: number | null;
  };
  byLanguage: (ReviewTally & { languageId: string; name: string })[];
  totals: {
    languages: number;
    vocabulary: number;
    new: number;
    learning: number;
    review: number;
    mastered: number;
  };
  dueCount: number;
  streak: number;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /** `now` là tham số để test đặt được "hôm nay" mà không phải giả lập đồng hồ hệ thống. */
  async getStats(
    ownerId: string,
    now: Date = new Date(),
  ): Promise<StatsResponse> {
    const timeZone = this.config.get('APP_TIMEZONE', { infer: true });
    const { start, end } = dayRange(now, timeZone);

    // Số truy vấn cố định, mọi phép đếm do database làm (COUNT / GROUP BY) — không tải
    // dòng ReviewLog hay Vocabulary nào về Node.
    const [
      byLanguage,
      languages,
      vocabulary,
      statusGroups,
      studiedDays,
      dueCount,
    ] = await Promise.all([
      this.prisma.$queryRaw<
        {
          languageId: string;
          name: string;
          reviewed: number;
          correct: number;
        }[]
      >`
          SELECT l.id AS "languageId", l.name,
                 COUNT(*)::int AS reviewed,
                 (COUNT(*) FILTER (WHERE r."isCorrect"))::int AS correct
          FROM "ReviewLog" r
          JOIN "Vocabulary" v ON v.id = r."vocabularyId"
          JOIN "Language" l ON l.id = v."languageId"
          WHERE r."ownerId" = ${ownerId}
            AND r."reviewedAt" >= ${toSqlTimestamp(start)}::timestamp
            AND r."reviewedAt" < ${toSqlTimestamp(end)}::timestamp
          GROUP BY l.id, l.name
          ORDER BY reviewed DESC, l.name ASC`,
      this.prisma.language.count({ where: { ownerId } }),
      this.prisma.vocabulary.count({ where: { ownerId } }),
      this.prisma.learningProgress.groupBy({
        by: ['status'],
        where: { ownerId },
        _count: { _all: true },
      }),
      // reviewedAt lưu theo UTC (timestamp không kèm múi giờ): gắn nhãn UTC, đổi sang
      // múi giờ cấu hình, rồi mới cắt lấy ngày.
      this.prisma.$queryRaw<{ day: string }[]>`
          SELECT DISTINCT to_char(
            (r."reviewedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone},
            'YYYY-MM-DD'
          ) AS day
          FROM "ReviewLog" r
          WHERE r."ownerId" = ${ownerId}
          ORDER BY day DESC
          LIMIT ${STREAK_LOOKBACK_DAYS}`,
      this.prisma.vocabulary.count({
        where: { ownerId, AND: [whereDue(now)] },
      }),
    ]);

    const countOf = (status: string): number =>
      statusGroups.find((group) => group.status === status)?._count._all ?? 0;
    const learning = countOf('LEARNING');
    const review = countOf('REVIEW');
    const mastered = countOf('MASTERED');
    // Từ chưa ôn lần nào không có dòng LearningProgress nhưng vẫn là NEW → lấy phần bù.
    const fresh = vocabulary - learning - review - mastered;

    const rows = byLanguage.map((row) => ({
      ...row,
      incorrect: row.reviewed - row.correct,
    }));
    const reviewed = rows.reduce((sum, row) => sum + row.reviewed, 0);
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);

    return {
      today: {
        reviewed,
        correct,
        incorrect: reviewed - correct,
        accuracy: reviewed === 0 ? null : correct / reviewed,
      },
      byLanguage: rows,
      totals: {
        languages,
        vocabulary,
        new: fresh,
        learning,
        review,
        mastered,
      },
      // Cùng điều kiện với GET /learning/due (whereDue) — đến hạn theo lịch ôn, ADR-012.
      dueCount,
      streak: countStreak(
        studiedDays.map((row) => row.day),
        localDateKey(now, timeZone),
      ),
    };
  }
}
