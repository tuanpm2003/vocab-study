import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LearningStatus } from '../generated/prisma/enums.js';
import type { ReviewDto } from './dto/review.dto.js';
import {
  applyReview,
  INITIAL_PROGRESS,
  isCorrectReview,
  type ReviewInput,
} from './progress-rules.js';
import {
  buildQuestion,
  CHOICE_COUNT,
  type BuiltQuestion,
  type ChoiceSource,
  type QuestionType,
} from './multiple-choice.js';
import { Prisma } from '../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { ReviewRating } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { previewIntervals } from './srs.js';
import { dueDateAfter } from './time-zone.js';
import {
  toVocabularyResponse,
  vocabularyInclude,
  whereDue,
  type VocabularyResponse,
} from '../vocabularies/vocabularies.service.js';
import type { ScopeDto, SessionQueryDto } from './dto/session.dto.js';

// Bể đáp án nhiễu cho mỗi ngôn ngữ. Đủ lớn để các câu không lặp lại cùng một bộ đáp án sai,
// đủ nhỏ để không bao giờ tải cả bảng.
const DISTRACTOR_POOL_SIZE = 60;

/**
 * Flashcard có `vocabulary` + `intervals` (số ngày tới lần ôn kế tiếp nếu chấm từng mức);
 * trắc nghiệm có `vocabulary` + các field của BuiltQuestion.
 */
export type SessionItem = {
  vocabulary: VocabularyResponse;
  intervals?: Record<ReviewRating, number>;
} & Partial<BuiltQuestion>;

function toFlashcardItem(vocabulary: VocabularyResponse): SessionItem {
  return { vocabulary, intervals: previewIntervals(vocabulary.progress) };
}

export interface SessionResponse {
  items: SessionItem[];
}

export interface DueResponse extends SessionResponse {
  /** Tổng số từ cần ôn trong phạm vi (không chỉ `limit` từ được trả về). */
  total: number;
}

export interface ProgressResponse {
  vocabularyId: string;
  status: LearningStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: Date | null;
  dueAt: Date | null;
  intervalDays: number;
}

/** `rating` cho flashcard, `isCorrect` cho quiz — đúng một trong hai, khớp với `mode`. */
function toReviewInput(dto: ReviewDto): ReviewInput {
  if (dto.mode === 'FLASHCARD') {
    // `== null` bắt cả undefined lẫn null: client gửi `"isCorrect": null` nghĩa là "không có".
    if (dto.rating == null || dto.isCorrect != null) {
      throw new BadRequestException(
        'mode FLASHCARD cần rating và không nhận isCorrect',
      );
    }
    return { rating: dto.rating };
  }
  if (dto.isCorrect == null || dto.rating != null) {
    throw new BadRequestException(
      'mode MULTIPLE_CHOICE cần isCorrect và không nhận rating',
    );
  }
  return { isCorrect: dto.isCorrect };
}

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async getSession(
    ownerId: string,
    query: SessionQueryDto,
  ): Promise<SessionResponse> {
    const ids = await this.pickRandomIds(ownerId, query);
    const vocabularies = await this.loadInOrder(ownerId, ids);
    if (query.mode === 'flashcard') {
      return { items: vocabularies.map(toFlashcardItem) };
    }
    return {
      items: await this.buildQuestions(
        ownerId,
        vocabularies,
        query.questionType,
      ),
    };
  }

  /**
   * Ghi nhận MỘT lần trả lời. Ba việc trong một transaction — hoặc cả ba, hoặc không gì:
   * thêm dòng ReviewLog, tạo/cập nhật LearningProgress, xếp lịch ôn kế tiếp (ADR-012).
   */
  async review(ownerId: string, dto: ReviewDto): Promise<ProgressResponse> {
    const input = toReviewInput(dto);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      // FOR UPDATE khóa dòng Vocabulary tới hết transaction. Hai lần ôn cùng một từ tới gần
      // như đồng thời sẽ xếp hàng ở đây, thay vì cùng đọc một tiến độ cũ rồi ghi đè lên
      // nhau (mất một lần đếm). Câu này cũng là bước kiểm tra tồn tại + quyền sở hữu.
      const [vocabulary] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Vocabulary"
        WHERE id = ${dto.vocabularyId} AND "ownerId" = ${ownerId}
        FOR UPDATE`;
      if (!vocabulary) {
        throw new NotFoundException(
          `Không tìm thấy từ vựng với id ${dto.vocabularyId}`,
        );
      }
      const current = await tx.learningProgress.findFirst({
        where: { vocabularyId: vocabulary.id, ownerId },
      });
      const next = applyReview(current ?? INITIAL_PROGRESS, input);
      const dueAt = dueDateAfter(
        now,
        next.intervalDays,
        this.config.get('APP_TIMEZONE', { infer: true }),
      );

      await tx.reviewLog.create({
        data: {
          ownerId,
          vocabularyId: vocabulary.id,
          mode: dto.mode,
          rating: dto.rating ?? null,
          isCorrect: isCorrectReview(input),
          reviewedAt: now,
        },
      });
      // upsert: lần ôn đầu tiên của một từ chính là lúc dòng tiến độ của nó ra đời.
      const saved = await tx.learningProgress.upsert({
        where: { vocabularyId: vocabulary.id, ownerId },
        create: {
          ownerId,
          vocabularyId: vocabulary.id,
          ...next,
          dueAt,
          lastReviewedAt: now,
        },
        update: { ...next, dueAt, lastReviewedAt: now },
      });
      return {
        vocabularyId: saved.vocabularyId,
        status: saved.status,
        reviewCount: saved.reviewCount,
        correctCount: saved.correctCount,
        incorrectCount: saved.incorrectCount,
        lastReviewedAt: saved.lastReviewedAt,
        dueAt: saved.dueAt,
        intervalDays: saved.intervalDays,
      };
    });
  }

  /**
   * Từ đến hạn ôn (ADR-012). Thứ tự: quá hạn lâu nhất trước, từ chưa ôn lần nào sau cùng —
   * nợ cũ trả trước khi vay mới.
   */
  async getDue(
    ownerId: string,
    scope: ScopeDto,
    now: Date = new Date(),
  ): Promise<DueResponse> {
    const where: Prisma.VocabularyWhereInput = {
      ownerId,
      languageId: scope.languageId,
      levelId: scope.levelId,
      ...(scope.collectionId && {
        collections: { some: { collectionId: scope.collectionId } },
      }),
      AND: [whereDue(now)],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vocabulary.findMany({
        where,
        include: vocabularyInclude,
        orderBy: [
          // nulls: 'last' — từ chưa ôn lần nào không có dòng tiến độ, nên sau phép JOIN
          // dueAt của nó là NULL và nó rơi xuống cuối, sau mọi từ đã có hạn ôn.
          { progress: { dueAt: { sort: 'asc', nulls: 'last' } } },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        take: scope.limit,
      }),
      this.prisma.vocabulary.count({ where }),
    ]);
    return {
      items: rows.map((row) => toFlashcardItem(toVocabularyResponse(row))),
      total,
    };
  }

  /**
   * Đáp án nhiễu sinh ở BACKEND: nếu frontend tự sinh thì nó phải tải toàn bộ từ vựng về máy.
   * Ở đây chỉ một "bể" nhỏ ngẫu nhiên cho mỗi ngôn ngữ rời khỏi database.
   */
  private async buildQuestions(
    ownerId: string,
    vocabularies: VocabularyResponse[],
    questionType: QuestionType,
  ): Promise<SessionItem[]> {
    if (vocabularies.length === 0) return [];
    const pools = await this.loadDistractorPools(ownerId, [
      ...new Set(vocabularies.map((v) => v.language.id)),
    ]);

    const items: SessionItem[] = [];
    for (const vocabulary of vocabularies) {
      const question = buildQuestion(
        vocabulary,
        pools.get(vocabulary.language.id) ?? [],
        questionType,
      );
      // Từ không dựng đủ 4 lựa chọn thì bỏ khỏi phiên, không trả một câu hỏi què.
      if (question) items.push({ vocabulary, ...question });
    }
    if (items.length === 0) {
      throw new BadRequestException(
        `Chưa đủ từ để làm trắc nghiệm: cần ít nhất ${CHOICE_COUNT} từ khác nhau (cả mặt chữ lẫn nghĩa) trong cùng một ngôn ngữ`,
      );
    }
    return items;
  }

  /**
   * MỘT truy vấn cho mọi ngôn ngữ của phiên: `row_number() OVER (PARTITION BY languageId
   * ORDER BY random())` đánh số ngẫu nhiên trong từng ngôn ngữ, rồi giữ lại POOL_SIZE dòng đầu.
   */
  private async loadDistractorPools(
    ownerId: string,
    languageIds: string[],
  ): Promise<Map<string, ChoiceSource[]>> {
    const rows = await this.prisma.$queryRaw<
      (ChoiceSource & { languageId: string })[]
    >`
      SELECT id, "languageId", term, meaning FROM (
        SELECT v.id, v."languageId", v.term, v.meaning,
               row_number() OVER (PARTITION BY v."languageId" ORDER BY random()) AS rn
        FROM "Vocabulary" v
        WHERE v."ownerId" = ${ownerId}
          AND v."languageId" IN (${Prisma.join(languageIds)})
      ) ranked
      WHERE rn <= ${DISTRACTOR_POOL_SIZE}`;

    const pools = new Map<string, ChoiceSource[]>();
    for (const row of rows) {
      const pool = pools.get(row.languageId) ?? [];
      pool.push({ id: row.id, term: row.term, meaning: row.meaning });
      pools.set(row.languageId, pool);
    }
    return pools;
  }

  /**
   * Chọn ngẫu nhiên NGAY TRONG database (`ORDER BY random() LIMIT n`): chỉ `limit` id
   * rời khỏi Postgres. Xáo trộn ở Node thì phải tải mọi từ trong phạm vi về trước.
   *
   * SQL thô nhưng an toàn: mọi giá trị đi qua tagged template `Prisma.sql`, nên chúng là
   * tham số ($1, $2…) chứ không bao giờ được nối vào chuỗi lệnh.
   */
  private async pickRandomIds(
    ownerId: string,
    scope: ScopeDto,
  ): Promise<string[]> {
    const conditions = [Prisma.sql`v."ownerId" = ${ownerId}`];
    if (scope.languageId) {
      conditions.push(Prisma.sql`v."languageId" = ${scope.languageId}`);
    }
    if (scope.levelId) {
      conditions.push(Prisma.sql`v."levelId" = ${scope.levelId}`);
    }
    if (scope.collectionId) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "VocabularyCollection" vc
        WHERE vc."vocabularyId" = v.id AND vc."collectionId" = ${scope.collectionId}
      )`);
    }
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT v.id FROM "Vocabulary" v
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY random()
      LIMIT ${scope.limit}`;
    return rows.map((row) => row.id);
  }

  /** Nạp đầy đủ các từ theo id, GIỮ đúng thứ tự của `ids` (findMany không bảo đảm thứ tự). */
  protected async loadInOrder(
    ownerId: string,
    ids: string[],
  ): Promise<VocabularyResponse[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.vocabulary.findMany({
      where: { id: { in: ids }, ownerId },
      include: vocabularyInclude,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [toVocabularyResponse(row)] : [];
    });
  }
}
