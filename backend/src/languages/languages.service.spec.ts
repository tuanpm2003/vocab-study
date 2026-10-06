import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LanguagesService } from './languages.service.js';

const OWNER = 'owner-a';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lang-1',
    ownerId: OWNER,
    name: 'Japanese',
    code: 'ja',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    _count: { vocabularies: 0 },
    ...overrides,
  };
}

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('LanguagesService', () => {
  const prismaMock = {
    language: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  let service: LanguagesService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LanguagesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(LanguagesService);
  });

  describe('findAll', () => {
    it('trả envelope phân trang và chỉ truy vấn dữ liệu của owner', async () => {
      prismaMock.language.findMany.mockResolvedValue([row()]);
      prismaMock.language.count.mockResolvedValue(21);

      const result = await service.findAll(OWNER, { page: 2, limit: 10 });

      expect(result).toMatchObject({
        total: 21,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
      expect(result.items[0]).toMatchObject({ id: 'lang-1', name: 'Japanese' });
      expect(result.items[0]).not.toHaveProperty('ownerId');
      expect(prismaMock.language.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: OWNER },
          skip: 10,
          take: 10,
        }),
      );
      expect(prismaMock.language.count).toHaveBeenCalledWith({
        where: { ownerId: OWNER },
      });
    });

    it('không có dữ liệu → items rỗng, totalPages 0', async () => {
      prismaMock.language.findMany.mockResolvedValue([]);
      prismaMock.language.count.mockResolvedValue(0);

      const result = await service.findAll(OWNER, { page: 1, limit: 20 });

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });
  });

  describe('findOne', () => {
    it('trả ngôn ngữ khi id thuộc owner', async () => {
      prismaMock.language.findFirst.mockResolvedValue(row());

      const result = await service.findOne('lang-1', OWNER);

      expect(result.name).toBe('Japanese');
      expect(prismaMock.language.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'lang-1', ownerId: OWNER } }),
      );
    });

    it('ném 404 khi không tìm thấy (kể cả khi id thuộc owner khác)', async () => {
      prismaMock.language.findFirst.mockResolvedValue(null);

      await expect(service.findOne('lang-x', OWNER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('gắn ownerId và đổi code rỗng thành null', async () => {
      prismaMock.language.create.mockResolvedValue(row({ code: null }));

      await service.create(OWNER, { name: 'Japanese', code: '' });

      expect(prismaMock.language.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { ownerId: OWNER, name: 'Japanese', code: null },
        }),
      );
    });

    it('trùng tên → 409 với thông điệp không lộ chi tiết database', async () => {
      prismaMock.language.create.mockRejectedValue(uniqueViolation());

      const error = await service
        .create(OWNER, { name: 'Japanese' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        'Ngôn ngữ "Japanese" đã tồn tại',
      );
    });

    it('lỗi khác của database được ném nguyên để filter chung xử lý', async () => {
      const boom = new Error('connection lost');
      prismaMock.language.create.mockRejectedValue(boom);

      await expect(service.create(OWNER, { name: 'X' })).rejects.toBe(boom);
    });
  });

  describe('update', () => {
    it('chỉ cập nhật field được gửi', async () => {
      prismaMock.language.findFirst.mockResolvedValue(row());
      prismaMock.language.update.mockResolvedValue(row({ name: 'Nihongo' }));

      const result = await service.update('lang-1', OWNER, { name: 'Nihongo' });

      expect(result.name).toBe('Nihongo');
      expect(prismaMock.language.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lang-1', ownerId: OWNER },
          data: { name: 'Nihongo', code: undefined },
        }),
      );
    });

    it('id không thuộc owner → 404 và không gọi update', async () => {
      prismaMock.language.findFirst.mockResolvedValue(null);

      await expect(
        service.update('lang-x', OWNER, { name: 'A' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.language.update).not.toHaveBeenCalled();
    });

    it('đổi sang tên đã có → 409', async () => {
      prismaMock.language.findFirst.mockResolvedValue(row());
      prismaMock.language.update.mockRejectedValue(uniqueViolation());

      await expect(
        service.update('lang-1', OWNER, { name: 'Chinese' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('xóa có lọc ownerId', async () => {
      prismaMock.language.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove('lang-1', OWNER);

      expect(prismaMock.language.deleteMany).toHaveBeenCalledWith({
        where: { id: 'lang-1', ownerId: OWNER },
      });
    });

    it('không xóa được dòng nào → 404', async () => {
      prismaMock.language.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('lang-x', OWNER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
