import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import { HealthService, type HealthStatus } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // Public ở cấp METHOD, không ở cấp class: route thêm vào controller này sau này sẽ mặc định
  // bị khóa như mọi route khác. Load balancer gọi /health mà không có phiên đăng nhập.
  @Public()
  @Get()
  @ApiOkResponse({ description: 'Backend và database đều hoạt động' })
  @ApiServiceUnavailableResponse({ description: 'Không kết nối được database' })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
