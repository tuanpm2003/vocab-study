import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LanguagesService } from '../languages/languages.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CollectionsService } from './collections.service.js';

const OWNER = 'owner-a';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'col-1',
    languageId: 'lang-ja',
    levelId: null,
    name: 'Food',
    kind: 'TOPIC',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    level: null,
    language: { id: 'lang-ja', name: 'Japanese' },
    _count: { vocabularies: 0 },
    ...overrides,
  };
}

describe('CollectionsService', () => {
  const prismaMock = {
    collection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    level: { findFirst: vi.fn() },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const languagesMock = { assertExists: vi.fn() };
  let service: CollectionsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LanguagesService, useValue: languagesMock },
      ],
    }).compile();
    service = module.get(CollectionsService);
  });

  describe('findAll', () => {
    beforeEach(() => {
      prismaMock.collection.findMany.mockResolvedValue([row()]);
      prismaMock.collection.count.mockResolvedValue(1);
    });

    function whereOfLastCall(): unknown {
      const call = prismaMock.collection.findMany.mock.calls.at(-1) as
        [{ where: unknown }] | undefined;
      return call?.[0].where;
    }

    it('luôn lọc theo owner qua quan hệ language', async () => {
      await service.findAll(OWNER, {
        languageId: 'lang-ja',
        page: 1,
        limit: 20,
      });

      expect(whereOfLastCall()).toMatchObject({
        languageId: 'lang-ja',
        language: { ownerId: OWNER },
      });
      expect(whereOfLastCall()).not.toHaveProperty('levelId');
    });

    it('levelId="null" → lọc levelId IS NULL (collection xuyên level)', async () => {
      await service.findAll(OWNER, {
        languageId: 'lang-ja',
        levelId: 'null',
        page: 1,
        limit: 20,
      });

      expect(whereOfLastCall()).toMatchObject({ levelId: null });
    });

    it('levelId=<id> → lọc đúng level đó', async () => {
      await service.findAll(OWNER, {
        languageId: 'lang-ja',
        levelId: 'lv-1',
        page: 1,
        limit: 20,
      });

      expect(whereOfLastCall()).toMatchObject({ levelId: 'lv-1' });
    });
  });

  describe('create', () => {
    it('không có levelId → không kiểm tra level, lưu levelId null', async () => {
      prismaMock.collection.create.mockResolvedValue(row());

      await service.create(OWNER, { languageId: 'lang-ja', name: 'Food' });

      expect(prismaMock.level.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ levelId: null }) as unknown,
        }),
      );
    });

    it('level thuộc ngôn ngữ khác → 400, không tạo', async () => {
      prismaMock.level.findFirst.mockResolvedValue({
        levelSystem: { languageId: 'lang-zh' },
      });

      await expect(
        service.create(OWNER, {
          languageId: 'lang-ja',
          levelId: 'lv-hsk1',
          name: 'Sai',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.collection.create).not.toHaveBeenCalled();
    });

    it('level không tồn tại (hoặc của owner khác) → 404', async () => {
      prismaMock.level.findFirst.mockResolvedValue(null);

      await expect(
        service.create(OWNER, {
          languageId: 'lang-ja',
          levelId: 'lv-x',
          name: 'X',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.level.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lv-x', levelSystem: { language: { ownerId: OWNER } } },
        }),
      );
    });

    it('ngôn ngữ không thuộc owner → 404', async () => {
      languagesMock.assertExists.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.create(OWNER, { languageId: 'lang-x', name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('kiểm tra level mới theo ngôn ngữ HIỆN TẠI của collection', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(row());
      prismaMock.level.findFirst.mockResolvedValue({
        levelSystem: { languageId: 'lang-zh' },
      });

      await expect(
        service.update('col-1', OWNER, { levelId: 'lv-hsk1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.collection.update).not.toHaveBeenCalled();
    });

    it('levelId=null → gỡ khỏi level mà không cần kiểm tra', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(
        row({ levelId: 'lv-1' }),
      );
      prismaMock.collection.update.mockResolvedValue(row());

      await service.update('col-1', OWNER, { levelId: null });

      expect(prismaMock.level.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.collection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ levelId: null }) as unknown,
        }),
      );
    });

    it('không tìm thấy → 404', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(null);

      await expect(
        service.update('col-x', OWNER, { name: 'A' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne / remove', () => {
    it('findOne không thấy → 404', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(null);

      await expect(service.findOne('col-x', OWNER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('remove lọc owner; không xóa được → 404', async () => {
      prismaMock.collection.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('col-x', OWNER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.collection.deleteMany).toHaveBeenCalledWith({
        where: { id: 'col-x', language: { ownerId: OWNER } },
      });
    });
  });
});
