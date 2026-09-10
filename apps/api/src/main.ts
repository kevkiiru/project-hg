import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import express from 'express';
import cookieParser from 'cookie-parser';
import { join, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { AppModule } from './app.module';
import { config } from './core/config/config';
import { GlobalExceptionFilter } from './core/http/exception.filter';
import { ResponseInterceptor } from './core/http/response.interceptor';
import { StorageController } from './modules/storage/storage.controller';
import { closeDb } from './db/db.module';

async function bootstrap() {
  // bodyParser disabled: we register parsers manually so binary uploads stream
  // raw and JSON webhook payloads keep an untouched rawBody for signatures.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    cors: {
      origin: config().CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
      credentials: true,
    },
  });

  app.set('trust proxy', 1);
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;

  // 1) Cookies (session auth + CSRF double-submit)
  expressApp.use(cookieParser());

  // 2) Local-driver binary ingestion (S3 presigns straight to AWS in prod).
  expressApp.put('/api/v1/storage/ingest', (req, res) => {
    void app.get(StorageController).handleIngestPut(req as any, res as any);
  });

  // 3) Public bucket static files (local driver only; S3 serves via CDN in prod).
  const publicRoot = normalize(join(config().STORAGE_LOCAL_PATH, 'public'));
  if (!existsSync(publicRoot)) {
    try {
      // synchronous ensure before static mounts; ignore if disk odd
      require('node:fs').mkdirSync(publicRoot, { recursive: true });
    } catch {
      /* noop */
    }
  }
  expressApp.use('/storage/public', express.static(publicRoot, {
    immutable: true,
    maxAge: '365d',
    fallthrough: true,
  }));

  // 4) JSON parser that preserves the exact raw bytes (webhook signatures).
  expressApp.use(
    express.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        if (Buffer.isBuffer(buf) && buf.length) req.rawBody = Buffer.from(buf);
      },
    }),
  );
  expressApp.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Global HTTP plumbing
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();

  const port = config().PORT;
  const server = await app.listen(port, '0.0.0.0');
  const logger = new Logger('bootstrap');
  logger.log(`Hiregari API listening on http://0.0.0.0:${port} (${config().NODE_ENV})`);

  const shutdown = async (signal: string) => {
    logger.log(`received ${signal}, shutting down`);
    await app.close().catch(() => undefined);
    await closeDb().catch(() => undefined);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('bootstrap failed', err);
  process.exit(1);
});
