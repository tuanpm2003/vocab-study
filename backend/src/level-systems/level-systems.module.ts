import { Module } from '@nestjs/common';
import { LanguagesModule } from '../languages/languages.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LevelSystemsController } from './level-systems.controller.js';
import { LevelSystemsService } from './level-systems.service.js';

@Module({
  imports: [PrismaModule, LanguagesModule],
  controllers: [LevelSystemsController],
  providers: [LevelSystemsService],
})
export class LevelSystemsModule {}
