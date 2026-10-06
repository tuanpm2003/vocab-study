import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { Prisma } from '../generated/prisma/client.js';
import { LanguagesService } from '../languages/languages.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateLevelDto,
  CreateLevelSystemDto,
  ReorderLevelsDto,
  UpdateLevelDto,
  UpdateLevelSystemDto,
} from './dto/level-system.dto.js';

const withLevels = {
  levels: { orderBy: { order: 'asc' } },
} satisfies Prisma.LevelSystemInclude;

export type LevelSystemWithLevels = Prisma.LevelSystemGetPayload<{
  include: typeof withLevels;
}>;

@Injectable()
export class LevelSystemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly languages: LanguagesService,
  ) {}

  async findByLanguage(
    languageId: string,
    ownerId: string,
  ): Promise<LevelSystemWithLevels[]> {
    await this.languages.assertExists(languageId, ownerId);
    return this.prisma.levelSystem.findMany({
      where: { languageId, language: { ownerId } },
      include: withLevels,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(
    languageId: string,
    ownerId: string,
    dto: CreateLevelSystemDto,
  ): Promise<LevelSystemWithLevels> {
    await this.languages.assertExists(languageId, ownerId);
    const levels = (dto.levels ?? []).map((level, index) => ({
      name: level.name,
      order: level.order ?? index + 1,
    }));

    // Một transaction: hoặc có cả hệ thống lẫn đủ level, hoặc không có gì.
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.levelSystem.count({
        where: { languageId, language: { ownerId } },
      });
      // Hệ thống đầu tiên của một ngôn ngữ mặc nhiên là default.
      const isDefault = dto.isDefault ?? existing === 0;
      if (isDefault) {
        await tx.levelSystem.updateMany({
          where: { languageId, language: { ownerId } },
          data: { isDefault: false },
        });
      }
      return tx.levelSystem.create({
        data: {
          languageId,
          name: dto.name,
          isDefault,
          levels: { create: levels },
        },
        include: withLevels,
      });
    });
  }

  async findOne(id: string, ownerId: string): Promise<LevelSystemWithLevels> {
    const system = await this.prisma.levelSystem.findFirst({
      where: { id, language: { ownerId } },
      include: withLevels,
    });
    if (!system) {
      throw new NotFoundException(`Không tìm thấy hệ thống level với id ${id}`);
    }
    return system;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateLevelSystemDto,
  ): Promise<LevelSystemWithLevels> {
    const system = await this.findOne(id, ownerId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        // Mỗi ngôn ngữ chỉ có tối đa một hệ thống default.
        await tx.levelSystem.updateMany({
          where: {
            languageId: system.languageId,
            language: { ownerId },
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
      return tx.levelSystem.update({
        where: { id, language: { ownerId } },
        data: { name: dto.name, isDefault: dto.isDefault },
        include: withLevels,
      });
    });
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const { count } = await this.prisma.levelSystem.deleteMany({
      where: { id, language: { ownerId } },
    });
    if (count === 0) {
      throw new NotFoundException(`Không tìm thấy hệ thống level với id ${id}`);
    }
  }

  async addLevel(systemId: string, ownerId: string, dto: CreateLevelDto) {
    const system = await this.findOne(systemId, ownerId);
    const lastOrder = system.levels.at(-1)?.order ?? 0;
    try {
      return await this.prisma.level.create({
        data: {
          levelSystemId: systemId,
          name: dto.name,
          order: dto.order ?? lastOrder + 1,
        },
      });
    } catch (error) {
      throw this.translateLevelError(error, dto.name);
    }
  }

  async updateLevel(id: string, ownerId: string, dto: UpdateLevelDto) {
    await this.findLevel(id, ownerId);
    try {
      return await this.prisma.level.update({
        where: { id, levelSystem: { language: { ownerId } } },
        data: { name: dto.name, order: dto.order },
      });
    } catch (error) {
      throw this.translateLevelError(error, dto.name);
    }
  }

  async removeLevel(id: string, ownerId: string): Promise<void> {
    const { count } = await this.prisma.level.deleteMany({
      where: { id, levelSystem: { language: { ownerId } } },
    });
    if (count === 0) {
      throw new NotFoundException(`Không tìm thấy level với id ${id}`);
    }
  }

  async reorderLevels(
    systemId: string,
    ownerId: string,
    dto: ReorderLevelsDto,
  ): Promise<LevelSystemWithLevels> {
    const system = await this.findOne(systemId, ownerId);
    const current = new Set(system.levels.map((level) => level.id));
    const sameSet =
      dto.levelIds.length === current.size &&
      dto.levelIds.every((id) => current.has(id));
    if (!sameSet) {
      throw new BadRequestException(
        'levelIds phải chứa đúng và đủ các level của hệ thống này',
      );
    }
    await this.prisma.$transaction(
      dto.levelIds.map((id, index) =>
        this.prisma.level.update({
          where: { id, levelSystemId: systemId },
          data: { order: index + 1 },
        }),
      ),
    );
    return this.findOne(systemId, ownerId);
  }

  private async findLevel(id: string, ownerId: string) {
    const level = await this.prisma.level.findFirst({
      where: { id, levelSystem: { language: { ownerId } } },
    });
    if (!level) {
      throw new NotFoundException(`Không tìm thấy level với id ${id}`);
    }
    return level;
  }

  private translateLevelError(error: unknown, name: string | undefined) {
    if (isUniqueViolation(error)) {
      return new ConflictException(
        `Level "${name ?? ''}" đã tồn tại trong hệ thống này`,
      );
    }
    return error;
  }
}
