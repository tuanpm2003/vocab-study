import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { paginate, type Paginated } from '../common/dto/pagination.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import { LanguagesService } from '../languages/languages.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateVocabularyDto,
  QueryVocabularyDto,
  UpdateVocabularyDto,
  VocabularySort,
} from './dto/vocabulary.dto.js';

// Một include cố định cho mọi truy vấn: Prisma gom quan hệ bằng số truy vấn KHÔNG ĐỔI
// theo số dòng — không có vòng lặp nào gọi database (tránh N+1).
export const vocabularyInclude = {
  language: { select: { id: true, name: true, code: true } },
  level: { select: { id: true, name: true } },
  collections: {
    select: { collection: { select: { id: true, name: true } } },
    orderBy: { addedAt: 'asc' },
  },
} satisfies Prisma.VocabularyInclude;

export type VocabularyRow = Prisma.VocabularyGetPayload<{
  include: typeof vocabularyInclude;
}>;

const ORDER_BY: Record<
  VocabularySort,
  Prisma.VocabularyOrderByWithRelationInput
> = {
  'createdAt:desc': { createdAt: 'desc' },
  'createdAt:asc': { createdAt: 'asc' },
  'updatedAt:desc': { updatedAt: 'desc' },
  'updatedAt:asc': { updatedAt: 'asc' },
  'term:asc': { term: 'asc' },
  'term:desc': { term: 'desc' },
};

export interface VocabularyWarning {
  code: 'POSSIBLE_DUPLICATE';
  message: string;
  existingIds: string[];
}

export function toVocabularyResponse(row: VocabularyRow) {
  return {
    id: row.id,
    term: row.term,
    meaning: row.meaning,
    reading: row.reading,
    romanization: row.romanization,
    exampleSentence: row.exampleSentence,
    exampleTranslation: row.exampleTranslation,
    notes: row.notes,
    extra: row.extra,
    language: row.language,
    level: row.level,
    collections: row.collections.map((link) => link.collection),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type VocabularyResponse = ReturnType<typeof toVocabularyResponse>;

function toJson(
  extra: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (extra === undefined) return undefined;
  return extra === null ? Prisma.DbNull : (extra as Prisma.InputJsonObject);
}

@Injectable()
export class VocabulariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly languages: LanguagesService,
  ) {}

  async findAll(
    ownerId: string,
    query: QueryVocabularyDto,
  ): Promise<Paginated<VocabularyResponse>> {
    const where: Prisma.VocabularyWhereInput = {
      ownerId,
      languageId: query.languageId,
      levelId: query.levelId,
    };
    if (query.collectionId) {
      where.collections = { some: { collectionId: query.collectionId } };
    }
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' } as const;
      where.OR = [
        { term: contains },
        { meaning: contains },
        { reading: contains },
        { romanization: contains },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vocabulary.findMany({
        where,
        include: vocabularyInclude,
        // id làm tiêu chí phụ: hai từ cùng giá trị sắp xếp không được đổi chỗ giữa các trang.
        orderBy: [ORDER_BY[query.sort], { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.vocabulary.count({ where }),
    ]);
    return paginate(rows.map(toVocabularyResponse), total, query);
  }

  async findOne(id: string, ownerId: string): Promise<VocabularyResponse> {
    return toVocabularyResponse(await this.findRow(id, ownerId));
  }

  async create(
    ownerId: string,
    dto: CreateVocabularyDto,
  ): Promise<VocabularyResponse & { warnings?: VocabularyWarning[] }> {
    await this.languages.assertExists(dto.languageId, ownerId);
    const collectionIds = dto.collectionIds ?? [];
    await this.assertLevel(dto.levelId, dto.languageId, ownerId);
    await this.assertCollections(collectionIds, dto.languageId, ownerId);

    const warnings = await this.findDuplicateWarnings(
      ownerId,
      dto.languageId,
      dto.term,
    );

    // Nested create = một transaction: không bao giờ có từ được lưu mà thiếu dòng bảng nối.
    const row = await this.prisma.vocabulary.create({
      data: {
        ownerId,
        languageId: dto.languageId,
        levelId: dto.levelId ?? null,
        term: dto.term,
        meaning: dto.meaning,
        reading: dto.reading ?? null,
        romanization: dto.romanization ?? null,
        exampleSentence: dto.exampleSentence ?? null,
        exampleTranslation: dto.exampleTranslation ?? null,
        notes: dto.notes ?? null,
        extra: toJson(dto.extra),
        collections: {
          create: collectionIds.map((collectionId) => ({ collectionId })),
        },
      },
      include: vocabularyInclude,
    });

    const response = toVocabularyResponse(row);
    return warnings.length > 0 ? { ...response, warnings } : response;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateVocabularyDto,
  ): Promise<VocabularyResponse> {
    const current = await this.findRow(id, ownerId);
    await this.assertLevel(dto.levelId, current.languageId, ownerId);
    if (dto.collectionIds) {
      await this.assertCollections(
        dto.collectionIds,
        current.languageId,
        ownerId,
      );
    }

    const { collectionIds } = dto;
    const row = await this.prisma.$transaction(async (tx) => {
      if (collectionIds) {
        // Thay TOÀN BỘ danh sách. Trong transaction: nếu bước thêm lỗi thì bước xóa
        // được hoàn tác — từ không bao giờ rơi vào trạng thái mất hết collection.
        await tx.vocabularyCollection.deleteMany({
          where: { vocabularyId: id, vocabulary: { ownerId } },
        });
        await tx.vocabularyCollection.createMany({
          data: collectionIds.map((collectionId) => ({
            vocabularyId: id,
            collectionId,
          })),
        });
      }
      return tx.vocabulary.update({
        where: { id, ownerId },
        data: {
          levelId: dto.levelId,
          term: dto.term,
          meaning: dto.meaning,
          reading: dto.reading,
          romanization: dto.romanization,
          exampleSentence: dto.exampleSentence,
          exampleTranslation: dto.exampleTranslation,
          notes: dto.notes,
          extra: toJson(dto.extra),
        },
        include: vocabularyInclude,
      });
    });
    return toVocabularyResponse(row);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const { count } = await this.prisma.vocabulary.deleteMany({
      where: { id, ownerId },
    });
    if (count === 0) {
      throw new NotFoundException(`Không tìm thấy từ vựng với id ${id}`);
    }
  }

  private async findRow(id: string, ownerId: string): Promise<VocabularyRow> {
    const row = await this.prisma.vocabulary.findFirst({
      where: { id, ownerId },
      include: vocabularyInclude,
    });
    if (!row) {
      throw new NotFoundException(`Không tìm thấy từ vựng với id ${id}`);
    }
    return row;
  }

  private async assertLevel(
    levelId: string | null | undefined,
    languageId: string,
    ownerId: string,
  ): Promise<void> {
    if (!levelId) return;
    const level = await this.prisma.level.findFirst({
      where: { id: levelId, levelSystem: { language: { ownerId } } },
      select: { levelSystem: { select: { languageId: true } } },
    });
    if (!level) {
      throw new NotFoundException(`Không tìm thấy level với id ${levelId}`);
    }
    if (level.levelSystem.languageId !== languageId) {
      throw new BadRequestException('Level không thuộc cùng ngôn ngữ với từ');
    }
  }

  private async assertCollections(
    collectionIds: string[],
    languageId: string,
    ownerId: string,
  ): Promise<void> {
    if (collectionIds.length === 0) return;
    // MỘT truy vấn cho cả danh sách, không lặp từng id.
    const found = await this.prisma.collection.findMany({
      where: { id: { in: collectionIds }, language: { ownerId } },
      select: { id: true, languageId: true },
    });
    if (found.length !== collectionIds.length) {
      const known = new Set(found.map((c) => c.id));
      const missing = collectionIds.filter((id) => !known.has(id));
      throw new NotFoundException(
        `Không tìm thấy collection với id ${missing.join(', ')}`,
      );
    }
    if (found.some((c) => c.languageId !== languageId)) {
      throw new BadRequestException(
        'Collection không thuộc cùng ngôn ngữ với từ',
      );
    }
  }

  /** Trùng mặt chữ chỉ là CẢNH BÁO, không phải lỗi: 行 = "đi" và cũng = "hàng". */
  private async findDuplicateWarnings(
    ownerId: string,
    languageId: string,
    term: string,
  ): Promise<VocabularyWarning[]> {
    const existing = await this.prisma.vocabulary.findMany({
      where: { ownerId, languageId, term },
      select: {
        id: true,
        collections: {
          select: { collection: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    if (existing.length === 0) return [];
    const where = existing[0]?.collections[0]?.collection.name;
    return [
      {
        code: 'POSSIBLE_DUPLICATE',
        message: where
          ? `Từ này đã có trong ${where}`
          : 'Từ này đã có trong danh sách',
        existingIds: existing.map((v) => v.id),
      },
    ];
  }
}
