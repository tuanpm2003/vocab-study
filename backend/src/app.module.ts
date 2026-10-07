import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { CollectionsModule } from './collections/collections.module.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { LanguagesModule } from './languages/languages.module.js';
import { LearningModule } from './learning/learning.module.js';
import { LevelSystemsModule } from './level-systems/level-systems.module.js';
import { VocabulariesModule } from './vocabularies/vocabularies.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    AuthModule,
    HealthModule,
    LanguagesModule,
    LevelSystemsModule,
    CollectionsModule,
    VocabulariesModule,
    LearningModule,
  ],
  // Guard TOÀN CỤC: mọi route đều cần đăng nhập, trừ route tự khai báo @Public().
  providers: [{ provide: APP_GUARD, useExisting: JwtAuthGuard }],
})
export class AppModule {}
