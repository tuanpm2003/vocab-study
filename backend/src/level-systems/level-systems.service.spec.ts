import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { LanguagesService } from '../languages/languages.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LevelSystemsService } from './level-systems.service.js';

const OWNER = 'owner-a';

const whereLevel = (id: string) => ({
  id,
  levelSystemId: 'sys-1',
  levelSystem: { language: { ownerId: OWNER } },
});

function system(levels: { id: string; order: number }[] = []) {
  return { id: 'sys-1', languageId: 'lang-1', name: 'JLPT', levels };
}

describe('LevelSystemsService', () => {
  const tx = {
    levelSystem: {
      count: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const prismaMock = {
    levelSystem: { findFirst: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    level: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: typeof tx) => unknown)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  const languagesMock = { assertExists: vi.fn() };
  let service: LevelSystemsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LevelSystemsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LanguagesService, useValue: languagesMock },
      ],
    }).compile();
    service = module.get(LevelSystemsService);
  });

  describe('create', () => {
    it('ngôn ngữ không thuộc owner → 404, không mở transaction', async () => {
      languagesMock.assertExists.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.create('lang-x', OWNER, { name: 'JLPT' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('hệ thống đầu tiên → isDefault=true, order lấy theo vị trí', async () => {
      tx.levelSystem.count.mockResolvedValue(0);
      tx.levelSystem.create.mockResolvedValue(system());

      await service.create('lang-1', OWNER, {
        name: 'JLPT',
        levels: [{ name: 'N5' }, { name: 'N4', order: 9 }],
      });

      expect(tx.levelSystem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            languageId: 'lang-1',
            name: 'JLPT',
            isDefault: true,
            levels: {
              create: [
                { name: 'N5', order: 1 },
                { name: 'N4', order: 9 },
              ],
            },
          },
        }),
      );
    });

    it('đã có hệ thống khác và không yêu cầu default → không đụng default cũ', async () => {
      tx.levelSystem.count.mockResolvedValue(1);
      tx.levelSystem.create.mockResolvedValue(system());

      await service.create('lang-1', OWNER, { name: 'Custom' });

      expect(tx.levelSystem.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('isDefault=true → gỡ default của các hệ thống khác cùng ngôn ngữ và cùng owner', async () => {
      prismaMock.levelSystem.findFirst.mockResolvedValue(system());
      tx.levelSystem.update.mockResolvedValue(system());

      await service.update('sys-1', OWNER, { isDefault: true });

      expect(tx.levelSystem.updateMany).toHaveBeenCalledWith({
        where: {
          languageId: 'lang-1',
          language: { ownerId: OWNER },
          id: { not: 'sys-1' },
        },
        data: { isDefault: false },
      });
    });

    it('không tìm thấy → 404', async () => {
      prismaMock.levelSystem.findFirst.mockResolvedValue(null);

      await expect(
        service.update('sys-x', OWNER, { name: 'A' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('lọc owner qua quan hệ language; không xóa được → 404', async () => {
      prismaMock.levelSystem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('sys-1', OWNER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.levelSystem.deleteMany).toHaveBeenCalledWith({
        where: { id: 'sys-1', language: { ownerId: OWNER } },
      });
    });
  });

  describe('addLevel', () => {
    it('không gửi order → xếp sau level cuối', async () => {
      prismaMock.levelSystem.findFirst.mockResolvedValue(
        system([
          { id: 'a', order: 1 },
          { id: 'b', order: 4 },
        ]),
      );
      prismaMock.level.create.mockResolvedValue({});

      await service.addLevel('sys-1', OWNER, { name: 'N3' });

      expect(prismaMock.level.create).toHaveBeenCalledWith({
        data: { levelSystemId: 'sys-1', name: 'N3', order: 5 },
      });
    });

    it('trùng tên → 409', async () => {
      prismaMock.levelSystem.findFirst.mockResolvedValue(system());
      prismaMock.level.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.addLevel('sys-1', OWNER, { name: 'N5' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updateLevel / removeLevel', () => {
    it('level không thuộc owner → 404, không gọi update', async () => {
      prismaMock.level.findFirst.mockResolvedValue(null);

      await expect(
        service.updateLevel('lv-x', OWNER, { name: 'A' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.level.update).not.toHaveBeenCalled();
    });

    it('removeLevel không xóa được dòng nào → 404', async () => {
      prismaMock.level.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeLevel('lv-x', OWNER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('reorderLevels', () => {
    const levels = [
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
      { id: 'c', order: 3 },
    ];

    it.each([
      ['thiếu một level', ['a', 'b']],
      ['có id lạ', ['a', 'b', 'x']],
      ['thừa level', ['a', 'b', 'c', 'd']],
    ])('%s → 400, không ghi gì', async (_label, levelIds) => {
      prismaMock.levelSystem.findFirst.mockResolvedValue(system(levels));

      await expect(
        service.reorderLevels('sys-1', OWNER, { levelIds }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.level.update).not.toHaveBeenCalled();
    });

    it('đủ và đúng → order = vị trí mới', async () => {
      prismaMock.levelSystem.findFirst.mockResolvedValue(system(levels));
      prismaMock.level.update.mockResolvedValue({});

      await service.reorderLevels('sys-1', OWNER, {
        levelIds: ['c', 'a', 'b'],
      });

      expect(prismaMock.level.update.mock.calls.map((c) => c[0])).toEqual([
        { where: whereLevel('c'), data: { order: 1 } },
        { where: whereLevel('a'), data: { order: 2 } },
        { where: whereLevel('b'), data: { order: 3 } },
      ]);
    });
  });
});
