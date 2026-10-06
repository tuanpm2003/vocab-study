import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { LanguagesService } from '../languages/languages.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VocabulariesService } from './vocabularies.service.js';

const OWNER = 'owner-a';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'voc-1',
    ownerId: OWNER,
    languageId: 'lang-ja',
    levelId: null,
    term: '食べる',
    meaning: 'ăn',
    reading: null,
    romanization: null,
    exampleSentence: null,
    exampleTranslation: null,
    notes: null,
    extra: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    language: { id: 'lang-ja', name: 'Japanese', code: 'ja' },
    level: null,
    collections: [{ collection: { id: 'col-1', name: 'Lesson 3' } }],
    ...overrides,
  };
}

describe('VocabulariesService', () => {
  const tx = {
    vocabularyCollection: { deleteMany: vi.fn(), createMany: vi.fn() },
    vocabulary: { update: vi.fn() },
  };
  const prismaMock = {
    vocabulary: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    level: { findFirst: vi.fn() },
    collection: { findMany: vi.fn() },
    $transaction: vi.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: typeof tx) => unknown)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  const languagesMock = { assertExists: vi.fn() };
  let service: VocabulariesService;

  beforeEach(async () => {
    vi.resetAllMocks();
    prismaMock.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: typeof tx) => unknown)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    );
    const module = await Test.createTestingModule({
      providers: [
        VocabulariesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LanguagesService, useValue: languagesMock },
      ],
    }).compile();
    service = module.get(VocabulariesService);
  });

  describe('findAll', () => {
    function lastFindManyArgs(): {
      where: Record<string, unknown>;
      orderBy: unknown;
      skip: number;
      take: number;
    } {
      const call = prismaMock.vocabulary.findMany.mock.calls.at(-1) as [never];
      return call[0];
    }

    beforeEach(() => {
      prismaMock.vocabulary.findMany.mockResolvedValue([row()]);
      prismaMock.vocabulary.count.mockResolvedValue(1);
    });

    it('luôn lọc ownerId; làm phẳng bảng nối thành collections[]', async () => {
      const result = await service.findAll(OWNER, {
        page: 1,
        limit: 20,
        sort: 'createdAt:desc',
      });

      expect(lastFindManyArgs().where).toMatchObject({ ownerId: OWNER });
      expect(lastFindManyArgs().where).not.toHaveProperty('OR');
      expect(result.items[0]?.collections).toEqual([
        { id: 'col-1', name: 'Lesson 3' },
      ]);
      expect(result.items[0]).not.toHaveProperty('ownerId');
    });

    it('search → OR trên 4 cột, không phân biệt hoa thường', async () => {
      await service.findAll(OWNER, {
        page: 1,
        limit: 20,
        sort: 'createdAt:desc',
        search: 'taber',
      });

      const contains = { contains: 'taber', mode: 'insensitive' };
      expect(lastFindManyArgs().where['OR']).toEqual([
        { term: contains },
        { meaning: contains },
        { reading: contains },
        { romanization: contains },
      ]);
    });

    it('collectionId → lọc qua bảng nối; sort → orderBy từ whitelist + id', async () => {
      await service.findAll(OWNER, {
        page: 3,
        limit: 10,
        sort: 'term:asc',
        collectionId: 'col-1',
      });

      expect(lastFindManyArgs()).toMatchObject({
        where: { collections: { some: { collectionId: 'col-1' } } },
        orderBy: [{ term: 'asc' }, { id: 'asc' }],
        skip: 20,
        take: 10,
      });
    });
  });

  describe('create', () => {
    const dto = { languageId: 'lang-ja', term: '行', meaning: 'đi' };

    it('không trùng → không có warnings; tạo từ + dòng bảng nối trong một lệnh', async () => {
      prismaMock.collection.findMany.mockResolvedValue([
        { id: 'col-1', languageId: 'lang-ja' },
      ]);
      prismaMock.vocabulary.findMany.mockResolvedValue([]);
      prismaMock.vocabulary.create.mockResolvedValue(row());

      const result = await service.create(OWNER, {
        ...dto,
        collectionIds: ['col-1'],
      });

      expect(result).not.toHaveProperty('warnings');
      expect(prismaMock.vocabulary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: OWNER,
            collections: { create: [{ collectionId: 'col-1' }] },
          }) as unknown,
        }),
      );
    });

    it('đã có từ cùng mặt chữ → vẫn tạo, kèm warnings', async () => {
      prismaMock.vocabulary.findMany.mockResolvedValue([
        { id: 'old-1', collections: [{ collection: { name: 'Lesson 1' } }] },
        { id: 'old-2', collections: [] },
      ]);
      prismaMock.vocabulary.create.mockResolvedValue(row());

      const result = await service.create(OWNER, dto);

      expect(prismaMock.vocabulary.create).toHaveBeenCalled();
      expect(result.warnings).toEqual([
        {
          code: 'POSSIBLE_DUPLICATE',
          message: 'Từ này đã có trong Lesson 1',
          existingIds: ['old-1', 'old-2'],
        },
      ]);
    });

    it('kiểm tra trùng chỉ trong cùng owner + cùng ngôn ngữ', async () => {
      prismaMock.vocabulary.findMany.mockResolvedValue([]);
      prismaMock.vocabulary.create.mockResolvedValue(row());

      await service.create(OWNER, dto);

      expect(prismaMock.vocabulary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: OWNER, languageId: 'lang-ja', term: '行' },
        }),
      );
    });

    it('một collection không tồn tại / của owner khác → 404 nêu id thiếu', async () => {
      prismaMock.collection.findMany.mockResolvedValue([
        { id: 'col-1', languageId: 'lang-ja' },
      ]);

      await expect(
        service.create(OWNER, { ...dto, collectionIds: ['col-1', 'col-x'] }),
      ).rejects.toThrow(/col-x/);
      expect(prismaMock.vocabulary.create).not.toHaveBeenCalled();
    });

    it('collection thuộc ngôn ngữ khác → 400', async () => {
      prismaMock.collection.findMany.mockResolvedValue([
        { id: 'col-zh', languageId: 'lang-zh' },
      ]);

      await expect(
        service.create(OWNER, { ...dto, collectionIds: ['col-zh'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('level thuộc ngôn ngữ khác → 400; level không tồn tại → 404', async () => {
      prismaMock.level.findFirst.mockResolvedValueOnce({
        levelSystem: { languageId: 'lang-zh' },
      });
      await expect(
        service.create(OWNER, { ...dto, levelId: 'lv-hsk' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      prismaMock.level.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.create(OWNER, { ...dto, levelId: 'lv-x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ngôn ngữ không thuộc owner → 404', async () => {
      languagesMock.assertExists.mockRejectedValueOnce(new NotFoundException());

      await expect(service.create(OWNER, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('không gửi collectionIds → không đụng bảng nối', async () => {
      prismaMock.vocabulary.findFirst.mockResolvedValue(row());
      tx.vocabulary.update.mockResolvedValue(row({ meaning: 'ăn cơm' }));

      const result = await service.update('voc-1', OWNER, {
        meaning: 'ăn cơm',
      });

      expect(result.meaning).toBe('ăn cơm');
      expect(tx.vocabularyCollection.deleteMany).not.toHaveBeenCalled();
      expect(tx.vocabulary.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'voc-1', ownerId: OWNER } }),
      );
    });

    it('gửi collectionIds → xóa hết rồi thêm lại, trong transaction', async () => {
      prismaMock.vocabulary.findFirst.mockResolvedValue(row());
      prismaMock.collection.findMany.mockResolvedValue([
        { id: 'col-2', languageId: 'lang-ja' },
      ]);
      tx.vocabulary.update.mockResolvedValue(row());

      await service.update('voc-1', OWNER, { collectionIds: ['col-2'] });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.vocabularyCollection.deleteMany).toHaveBeenCalledWith({
        where: { vocabularyId: 'voc-1', vocabulary: { ownerId: OWNER } },
      });
      expect(tx.vocabularyCollection.createMany).toHaveBeenCalledWith({
        data: [{ vocabularyId: 'voc-1', collectionId: 'col-2' }],
      });
    });

    it('collectionIds không hợp lệ → lỗi TRƯỚC khi xóa bất cứ thứ gì', async () => {
      prismaMock.vocabulary.findFirst.mockResolvedValue(row());
      prismaMock.collection.findMany.mockResolvedValue([]);

      await expect(
        service.update('voc-1', OWNER, { collectionIds: ['col-x'] }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('extra=null → ghi SQL NULL (Prisma.DbNull)', async () => {
      prismaMock.vocabulary.findFirst.mockResolvedValue(row());
      tx.vocabulary.update.mockResolvedValue(row());

      await service.update('voc-1', OWNER, { extra: null });

      expect(tx.vocabulary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ extra: Prisma.DbNull }) as unknown,
        }),
      );
    });

    it('từ không thuộc owner → 404', async () => {
      prismaMock.vocabulary.findFirst.mockResolvedValue(null);

      await expect(
        service.update('voc-x', OWNER, { meaning: 'a' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne / remove', () => {
    it('findOne không thấy → 404', async () => {
      prismaMock.vocabulary.findFirst.mockResolvedValue(null);

      await expect(service.findOne('voc-x', OWNER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('remove lọc ownerId; không xóa được → 404', async () => {
      prismaMock.vocabulary.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('voc-x', OWNER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.vocabulary.deleteMany).toHaveBeenCalledWith({
        where: { id: 'voc-x', ownerId: OWNER },
      });
    });
  });
});
