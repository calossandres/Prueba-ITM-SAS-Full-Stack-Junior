import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
config({ quiet: true, path: resolve(__dirname, '../../.env.local') });
config({ quiet: true, path: resolve(__dirname, '../../.env') });
config({ quiet: true, path: resolve(__dirname, '../.env') });
async function bootstrap() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error('Configura SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local de la raíz.');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3001), '127.0.0.1');
}
bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
