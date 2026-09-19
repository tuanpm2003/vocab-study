import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const reachable = await this.prisma.isDatabaseReachable();
    const result: HealthStatus = {
      status: reachable ? 'ok' : 'error',
      database: reachable ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
    if (!reachable) {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
