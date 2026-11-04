import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../.env') });
async function bootstrap() {
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en el archivo .env de la raíz.');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3001), '127.0.0.1');
}
bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
