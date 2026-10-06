import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { OwnerGuard } from './common/owner/owner.guard.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { LanguagesModule } from './languages/languages.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    HealthModule,
    LanguagesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: OwnerGuard }],
})
export class AppModule {}
