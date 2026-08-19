import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { assertProductionEnv, corsOrigins, isProduction } from './config/env';

async function bootstrap() {
  assertProductionEnv();

  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: isProduction() ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const origins = corsOrigins();
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`AasPaas API listening on http://0.0.0.0:${port}/api`);
}
bootstrap();
