import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReviewDto } from './dto/review.dto.js';
import { ScopeDto, SessionQueryDto } from './dto/session.dto.js';
import { LearningService } from './learning.service.js';

@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(private readonly service: LearningService) {}

  @Get('session')
  getSession(@CurrentUser() ownerId: string, @Query() query: SessionQueryDto) {
    return this.service.getSession(ownerId, query);
  }

  @Get('due')
  getDue(@CurrentUser() ownerId: string, @Query() query: ScopeDto) {
    return this.service.getDue(ownerId, query);
  }

  @Post('review')
  review(@CurrentUser() ownerId: string, @Body() dto: ReviewDto) {
    return this.service.review(ownerId, dto);
  }
}
