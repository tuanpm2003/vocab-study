import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  toVocabularyResponse,
  vocabularyInclude,
  type VocabularyResponse,
} from '../vocabularies/vocabularies.service.js';
import type { ScopeDto, SessionQueryDto } from './dto/session.dto.js';

export interface SessionItem {
  vocabulary: VocabularyResponse;
}

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
    return { items: vocabularies.map((vocabulary) => ({ vocabulary })) };
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
