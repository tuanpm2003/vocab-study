import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  paginate,
  type Paginated,
  type PaginationDto,
} from '../common/dto/pagination.dto.js';
import { Prisma, type Language } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateLanguageDto } from './dto/create-language.dto.js';
import type { UpdateLanguageDto } from './dto/update-language.dto.js';

export interface LanguageResponse {
  id: string;
  name: string;
  code: string | null;
  vocabularyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ownerId cố ý không có trong response: client không gửi và không thấy nó (docs/API.md).
function toResponse(language: Language): LanguageResponse {
  return {
    id: language.id,
    name: language.name,
    code: language.code,
    // Bảng Vocabulary chưa tồn tại — F4-07 thay bằng _count.
    vocabularyCount: 0,
    createdAt: language.createdAt,
    updatedAt: language.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class LanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    ownerId: string,
    query: PaginationDto,
  ): Promise<Paginated<LanguageResponse>> {
    const where = { ownerId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.language.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.language.count({ where }),
    ]);
    return paginate(items.map(toResponse), total, query);
  }

  async findOne(id: string, ownerId: string): Promise<LanguageResponse> {
    const language = await this.prisma.language.findFirst({
      where: { id, ownerId },
    });
    if (!language) {
      throw new NotFoundException(`Không tìm thấy ngôn ngữ với id ${id}`);
    }
    return toResponse(language);
  }

  async create(
    ownerId: string,
    dto: CreateLanguageDto,
  ): Promise<LanguageResponse> {
    try {
      const language = await this.prisma.language.create({
        data: { ownerId, name: dto.name, code: dto.code || null },
      });
      return toResponse(language);
    } catch (error) {
      throw this.translateError(error, dto.name);
    }
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateLanguageDto,
  ): Promise<LanguageResponse> {
    await this.findOne(id, ownerId);
    try {
      const language = await this.prisma.language.update({
        where: { id, ownerId },
        data: {
          name: dto.name,
          code: dto.code === undefined ? undefined : dto.code || null,
        },
      });
      return toResponse(language);
    } catch (error) {
      throw this.translateError(error, dto.name);
    }
  }

  async remove(id: string, ownerId: string): Promise<void> {
    // deleteMany thay vì delete: lọc được ownerId trong chính câu lệnh xóa,
    // và không ném lỗi Prisma khi bản ghi không tồn tại.
    const { count } = await this.prisma.language.deleteMany({
      where: { id, ownerId },
    });
    if (count === 0) {
      throw new NotFoundException(`Không tìm thấy ngôn ngữ với id ${id}`);
    }
  }

  private translateError(error: unknown, name: string | undefined): unknown {
    if (isUniqueViolation(error)) {
      return new ConflictException(`Ngôn ngữ "${name ?? ''}" đã tồn tại`);
    }
    return error;
  }
}
