import { Module } from '@nestjs/common';
import { LanguagesModule } from '../languages/languages.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CollectionsController } from './collections.controller.js';
import { CollectionsService } from './collections.service.js';

@Module({
  imports: [PrismaModule, LanguagesModule],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
