import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { SessionQueryDto } from './dto/session.dto.js';
import { LearningService } from './learning.service.js';

@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(private readonly service: LearningService) {}

  @Get('session')
  getSession(@CurrentUser() ownerId: string, @Query() query: SessionQueryDto) {
    return this.service.getSession(ownerId, query);
  }
}
