import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const prismaMock = { isDatabaseReachable: vi.fn() };
  let service: HealthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(HealthService);
  });

  it('báo ok khi database kết nối được', async () => {
    prismaMock.isDatabaseReachable.mockResolvedValue(true);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });

  it('ném 503 kèm trạng thái chi tiết khi database không kết nối được', async () => {
    prismaMock.isDatabaseReachable.mockResolvedValue(false);

    const error = await service.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    const exception = error as ServiceUnavailableException;
    expect(exception.getStatus()).toBe(503);
    expect(exception.getResponse()).toMatchObject({
      status: 'error',
      database: 'disconnected',
    });
  });
});
