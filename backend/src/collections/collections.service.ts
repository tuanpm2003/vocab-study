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
  CreateCollectionDto,
  QueryCollectionDto,
  UpdateCollectionDto,
} from './dto/collection.dto.js';

const include = {
  level: { select: { id: true, name: true } },
  language: { select: { id: true, name: true } },
} satisfies Prisma.CollectionInclude;

type CollectionRow = Prisma.CollectionGetPayload<{ include: typeof include }>;

function toResponse(row: CollectionRow) {
  return {
    id: row.id,
    languageId: row.languageId,
    language: row.language,
    levelId: row.levelId,
    level: row.level,
    name: row.name,
    kind: row.kind,
    description: row.description,
    // Bảng Vocabulary chưa tồn tại — F4-07 thay bằng _count.
    vocabularyCount: 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type CollectionResponse = ReturnType<typeof toResponse>;

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly languages: LanguagesService,
  ) {}

  async findAll(
    ownerId: string,
    query: QueryCollectionDto,
  ): Promise<Paginated<CollectionResponse>> {
    const where: Prisma.CollectionWhereInput = {
      languageId: query.languageId,
      language: { ownerId },
      kind: query.kind,
    };
    if (query.levelId !== undefined) {
      where.levelId = query.levelId === 'null' ? null : query.levelId;
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        include,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.collection.count({ where }),
    ]);
    return paginate(rows.map(toResponse), total, query);
  }

  async findOne(id: string, ownerId: string): Promise<CollectionResponse> {
    const row = await this.prisma.collection.findFirst({
      where: { id, language: { ownerId } },
      include,
    });
    if (!row) {
      throw new NotFoundException(`Không tìm thấy collection với id ${id}`);
    }
    return toResponse(row);
  }

  async create(
    ownerId: string,
    dto: CreateCollectionDto,
  ): Promise<CollectionResponse> {
    await this.languages.assertExists(dto.languageId, ownerId);
    if (dto.levelId) {
      await this.assertLevelInLanguage(dto.levelId, dto.languageId, ownerId);
    }
    const row = await this.prisma.collection.create({
      data: {
        languageId: dto.languageId,
        levelId: dto.levelId ?? null,
        name: dto.name,
        kind: dto.kind,
        description: dto.description ?? null,
      },
      include,
    });
    return toResponse(row);
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateCollectionDto,
  ): Promise<CollectionResponse> {
    const current = await this.findOne(id, ownerId);
    if (dto.levelId) {
      await this.assertLevelInLanguage(
        dto.levelId,
        current.languageId,
        ownerId,
      );
    }
    const row = await this.prisma.collection.update({
      where: { id, language: { ownerId } },
      data: {
        // undefined = không đụng tới; null = gỡ khỏi level.
        levelId: dto.levelId,
        name: dto.name,
        kind: dto.kind,
        description: dto.description,
      },
      include,
    });
    return toResponse(row);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const { count } = await this.prisma.collection.deleteMany({
      where: { id, language: { ownerId } },
    });
    if (count === 0) {
      throw new NotFoundException(`Không tìm thấy collection với id ${id}`);
    }
  }

  /** Level phải thuộc CÙNG ngôn ngữ với collection — "N5" của tiếng Nhật không gắn được vào bài tiếng Trung. */
  private async assertLevelInLanguage(
    levelId: string,
    languageId: string,
    ownerId: string,
  ): Promise<void> {
    const level = await this.prisma.level.findFirst({
      where: { id: levelId, levelSystem: { language: { ownerId } } },
      select: { levelSystem: { select: { languageId: true } } },
    });
    if (!level) {
      throw new NotFoundException(`Không tìm thấy level với id ${levelId}`);
    }
    if (level.levelSystem.languageId !== languageId) {
      throw new BadRequestException(
        'Level không thuộc cùng ngôn ngữ với collection',
      );
    }
  }
}
