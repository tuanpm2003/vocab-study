import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LearningController } from './learning.controller.js';
import { LearningService } from './learning.service.js';
import { StatsService } from './stats.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [LearningController],
  providers: [LearningService, StatsService],
})
export class LearningModule {}
