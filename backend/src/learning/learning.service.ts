import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildQuestion,
  CHOICE_COUNT,
  type BuiltQuestion,
  type ChoiceSource,
  type QuestionType,
} from './multiple-choice.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  toVocabularyResponse,
  vocabularyInclude,
  type VocabularyResponse,
} from '../vocabularies/vocabularies.service.js';
import type { ScopeDto, SessionQueryDto } from './dto/session.dto.js';

// Bể đáp án nhiễu cho mỗi ngôn ngữ. Đủ lớn để các câu không lặp lại cùng một bộ đáp án sai,
// đủ nhỏ để không bao giờ tải cả bảng.
const DISTRACTOR_POOL_SIZE = 60;

/** Flashcard chỉ có `vocabulary`; trắc nghiệm có thêm các field của BuiltQuestion. */
export type SessionItem = {
  vocabulary: VocabularyResponse;
} & Partial<BuiltQuestion>;

export interface SessionResponse {
  items: SessionItem[];
}

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async getSession(
    ownerId: string,
    query: SessionQueryDto,
  ): Promise<SessionResponse> {
    const ids = await this.pickRandomIds(ownerId, query);
    const vocabularies = await this.loadInOrder(ownerId, ids);
    if (query.mode === 'flashcard') {
      return { items: vocabularies.map((vocabulary) => ({ vocabulary })) };
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
