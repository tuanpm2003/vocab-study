import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService<EnvironmentVariables, true>);

  // Swagger liệt kê mọi endpoint và DTO: tiện khi dev, là bản đồ cho kẻ dò quét khi công khai.
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Vocabulary API')
      .setDescription(
        'REST API của Multi-Language Vocabulary App — xem docs/API.md',
      )
      .setVersion('0.1.0')
      .build();
    SwaggerModule.setup('api', app, () =>
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  await app.listen(
    config.get('PORT', { infer: true }),
    config.get('HOST', { infer: true }),
  );
}
await bootstrap();
