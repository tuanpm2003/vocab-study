import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, type HealthStatus } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'Backend và database đều hoạt động' })
  @ApiServiceUnavailableResponse({ description: 'Không kết nối được database' })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
