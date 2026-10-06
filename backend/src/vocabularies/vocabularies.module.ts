import { Module } from '@nestjs/common';
import { LanguagesModule } from '../languages/languages.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { VocabulariesController } from './vocabularies.controller.js';
import { VocabulariesService } from './vocabularies.service.js';

@Module({
  imports: [PrismaModule, LanguagesModule],
  controllers: [VocabulariesController],
  providers: [VocabulariesService],
})
export class VocabulariesModule {}
