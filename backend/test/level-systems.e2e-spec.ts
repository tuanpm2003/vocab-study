import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OTHER_OWNER, resetDatabase } from './helpers/app.js';

interface LevelBody {
  id: string;
  name: string;
  order: number;
}
interface SystemBody {
  id: string;
  name: string;
  isDefault: boolean;
  levels: LevelBody[];
}

const JLPT = {
  name: 'JLPT',
  levels: ['N5', 'N4', 'N3', 'N2', 'N1'].map((name, i) => ({
    name,
    order: i + 1,
  })),
};

describe('Level systems & levels (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let languageId: string;
  const api = () => request(app.getHttpServer());

  async function createSystem(body: object = JLPT): Promise<SystemBody> {
    const res = await api()
      .post(`/languages/${languageId}/level-systems`)
      .send(body)
      .expect(201);
    return res.body as SystemBody;
  }

  async function listSystems(): Promise<SystemBody[]> {
    const res = await api()
      .get(`/languages/${languageId}/level-systems`)
      .expect(200);
    return res.body as SystemBody[];
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const res = await api()
      .post('/languages')
      .send({ name: 'Japanese', code: 'ja' })
      .expect(201);
    languageId = (res.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('tạo hệ thống level', () => {
    it('một request tạo JLPT kèm N5→N1, level sắp theo order', async () => {
      const system = await createSystem();

      expect(system.name).toBe('JLPT');
      expect(system.levels.map((l) => l.name)).toEqual([
        'N5',
        'N4',
        'N3',
        'N2',
        'N1',
      ]);
      expect(await prisma.level.count()).toBe(5);
    });

    it('không gửi order → lấy theo vị trí trong mảng', async () => {
      const system = await createSystem({
        name: 'HSK',
        levels: [{ name: 'HSK 1' }, { name: 'HSK 2' }],
      });
      expect(system.levels.map((l) => l.order)).toEqual([1, 2]);
    });

    it('hệ thống đầu tiên tự thành default; cái thứ hai thì không', async () => {
      const first = await createSystem();
      const second = await createSystem({ name: 'Custom' });

      expect(first.isDefault).toBe(true);
      expect(second.isDefault).toBe(false);
    });

    it('tên level trùng trong cùng request → 400 và không tạo gì', async () => {
      await api()
        .post(`/languages/${languageId}/level-systems`)
        .send({ name: 'X', levels: [{ name: 'A' }, { name: 'A' }] })
        .expect(400);
      expect(await prisma.levelSystem.count()).toBe(0);
    });

    it('thiếu name / level thiếu name / field lạ → 400', async () => {
      const url = `/languages/${languageId}/level-systems`;
      await api().post(url).send({}).expect(400);
      await api()
        .post(url)
        .send({ name: 'X', levels: [{ order: 1 }] })
        .expect(400);
      await api().post(url).send({ name: 'X', languageId: 'y' }).expect(400);
      // chuỗi "false" không được ngầm hiểu thành true
      await api().post(url).send({ name: 'X', isDefault: 'false' }).expect(400);
    });

    it('ngôn ngữ không tồn tại hoặc của owner khác → 404', async () => {
      const foreign = await prisma.language.create({
        data: { ownerId: OTHER_OWNER, name: 'Secret' },
      });

      await api()
        .post('/languages/khong-co/level-systems')
        .send(JLPT)
        .expect(404);
      await api()
        .post(`/languages/${foreign.id}/level-systems`)
        .send(JLPT)
        .expect(404);
      await api().get(`/languages/${foreign.id}/level-systems`).expect(404);
      expect(await prisma.levelSystem.count()).toBe(0);
    });
  });

  describe('isDefault', () => {
    it('đặt default cho B thì A tự bỏ default', async () => {
      const a = await createSystem();
      const b = await createSystem({ name: 'Custom' });

      await api()
        .patch(`/level-systems/${b.id}`)
        .send({ isDefault: true })
        .expect(200);

      const systems = await listSystems();
      expect(systems.find((s) => s.id === a.id)?.isDefault).toBe(false);
      expect(systems.find((s) => s.id === b.id)?.isDefault).toBe(true);
      // default luôn đứng đầu danh sách
      expect(systems[0]?.id).toBe(b.id);
    });

    it('tạo mới với isDefault=true cũng gỡ default của cái cũ', async () => {
      const a = await createSystem();
      await createSystem({ name: 'Custom', isDefault: true });

      const systems = await listSystems();
      expect(systems.filter((s) => s.isDefault)).toHaveLength(1);
      expect(systems.find((s) => s.id === a.id)?.isDefault).toBe(false);
    });

    it('default của ngôn ngữ này không ảnh hưởng ngôn ngữ khác', async () => {
      await createSystem();
      const other = await api()
        .post('/languages')
        .send({ name: 'Chinese' })
        .expect(201);
      const otherId = (other.body as { id: string }).id;
      await api()
        .post(`/languages/${otherId}/level-systems`)
        .send({ name: 'HSK', isDefault: true })
        .expect(201);

      expect((await listSystems())[0]?.isDefault).toBe(true);
    });
  });

  describe('sửa / xóa hệ thống', () => {
    it('đổi tên → 200; xóa → 204 và cascade xóa level', async () => {
      const system = await createSystem();

      const renamed = await api()
        .patch(`/level-systems/${system.id}`)
        .send({ name: 'JLPT mới' })
        .expect(200);
      expect((renamed.body as SystemBody).name).toBe('JLPT mới');

      await api().delete(`/level-systems/${system.id}`).expect(204);
      expect(await prisma.level.count()).toBe(0);
      await api().delete(`/level-systems/${system.id}`).expect(404);
    });

    it('xóa Language → cascade xóa LevelSystem và Level', async () => {
      await createSystem();

      await api().delete(`/languages/${languageId}`).expect(204);

      expect(await prisma.levelSystem.count()).toBe(0);
      expect(await prisma.level.count()).toBe(0);
    });
  });

  describe('level', () => {
    it('thêm level → xếp cuối; trùng tên → 409', async () => {
      const system = await createSystem();
      const url = `/level-systems/${system.id}/levels`;

      const added = await api().post(url).send({ name: 'N0' }).expect(201);
      expect((added.body as LevelBody).order).toBe(6);

      const dup = await api().post(url).send({ name: ' N5 ' }).expect(409);
      expect(dup.body.message).toBe('Level "N5" đã tồn tại trong hệ thống này');
    });

    it('cùng tên level ở hai hệ thống khác nhau thì hợp lệ', async () => {
      await createSystem();
      const custom = await createSystem({ name: 'Custom' });
      await api()
        .post(`/level-systems/${custom.id}/levels`)
        .send({ name: 'N5' })
        .expect(201);
    });

    it('đổi tên level; đổi sang tên đã có → 409', async () => {
      const system = await createSystem();
      const n5 = system.levels[0] as LevelBody;

      const res = await api()
        .patch(`/levels/${n5.id}`)
        .send({ name: 'Sơ cấp' })
        .expect(200);
      expect((res.body as LevelBody).name).toBe('Sơ cấp');

      await api().patch(`/levels/${n5.id}`).send({ name: 'N4' }).expect(409);
    });

    it('đổi thứ tự → danh sách trả về đúng thứ tự mới', async () => {
      const system = await createSystem();
      const reversed = system.levels.map((l) => l.id).reverse();

      const res = await api()
        .post(`/level-systems/${system.id}/levels/reorder`)
        .send({ levelIds: reversed })
        .expect(200);

      expect((res.body as SystemBody).levels.map((l) => l.name)).toEqual([
        'N1',
        'N2',
        'N3',
        'N4',
        'N5',
      ]);
      expect((await listSystems())[0]?.levels.map((l) => l.name)).toEqual([
        'N1',
        'N2',
        'N3',
        'N4',
        'N5',
      ]);
    });

    it('reorder thiếu level hoặc có id lạ → 400, thứ tự giữ nguyên', async () => {
      const system = await createSystem();
      const ids = system.levels.map((l) => l.id);
      const url = `/level-systems/${system.id}/levels/reorder`;

      await api()
        .post(url)
        .send({ levelIds: ids.slice(1) })
        .expect(400);
      await api()
        .post(url)
        .send({ levelIds: [...ids.slice(1), 'la'] })
        .expect(400);

      expect((await listSystems())[0]?.levels[0]?.name).toBe('N5');
    });

    it('xóa level → 204; id không tồn tại → 404', async () => {
      const system = await createSystem();
      const n5 = system.levels[0] as LevelBody;

      await api().delete(`/levels/${n5.id}`).expect(204);
      await api().delete(`/levels/${n5.id}`).expect(404);
      expect((await listSystems())[0]?.levels).toHaveLength(4);
    });
  });

  it('GET /languages/:id trả kèm levelSystems và levels đã sắp xếp', async () => {
    await createSystem();

    const res = await api().get(`/languages/${languageId}`).expect(200);

    const systems = (res.body as { levelSystems: SystemBody[] }).levelSystems;
    expect(systems).toHaveLength(1);
    expect(systems[0]?.levels.map((l) => l.name)).toEqual([
      'N5',
      'N4',
      'N3',
      'N2',
      'N1',
    ]);
  });

  it('cách ly ownerId: không sửa/xóa được hệ thống và level của owner khác', async () => {
    const foreign = await prisma.language.create({
      data: {
        ownerId: OTHER_OWNER,
        name: 'Secret',
        levelSystems: {
          create: { name: 'S', levels: { create: { name: 'L1', order: 1 } } },
        },
      },
      include: { levelSystems: { include: { levels: true } } },
    });
    const system = foreign.levelSystems[0];
    const level = system?.levels[0];
    if (!system || !level) throw new Error('fixture lỗi');

    await api()
      .patch(`/level-systems/${system.id}`)
      .send({ name: 'Hacked' })
      .expect(404);
    await api().delete(`/level-systems/${system.id}`).expect(404);
    await api()
      .post(`/level-systems/${system.id}/levels`)
      .send({ name: 'X' })
      .expect(404);
    await api()
      .post(`/level-systems/${system.id}/levels/reorder`)
      .send({ levelIds: [level.id] })
      .expect(404);
    await api().patch(`/levels/${level.id}`).send({ name: 'X' }).expect(404);
    await api().delete(`/levels/${level.id}`).expect(404);

    expect(await prisma.level.count()).toBe(1);
    expect((await prisma.levelSystem.findFirst())?.name).toBe('S');
  });
});
