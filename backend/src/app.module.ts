import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CollectionsModule } from './collections/collections.module.js';
import { OwnerGuard } from './common/owner/owner.guard.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { LanguagesModule } from './languages/languages.module.js';
import { LearningModule } from './learning/learning.module.js';
import { LevelSystemsModule } from './level-systems/level-systems.module.js';
import { VocabulariesModule } from './vocabularies/vocabularies.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    HealthModule,
    LanguagesModule,
    LevelSystemsModule,
    CollectionsModule,
    VocabulariesModule,
    LearningModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: OwnerGuard }],
})
export class AppModule {}
