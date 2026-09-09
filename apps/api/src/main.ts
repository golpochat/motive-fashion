import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, raw, type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import { ZodExceptionFilter } from './common/zod-exception.filter';
import { rateLimit, requestIdMiddleware, securityHeaders } from './common/http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(securityHeaders);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/v1/auth') || req.path === '/api/v1/contact' || /\/checkout\/[^/]+\/pay$/.test(req.path)) {
      rateLimit(30, 60_000)(req, res, next);
      return;
    }
    next();
  });
  app.use('/api/v1/webhooks/stripe', raw({ type: 'application/json' }));
  app.use('/api/v1/webhooks/whatsapp', raw({ type: 'application/json' }));
  app.use('/api/v1/webhooks/square', raw({ type: 'application/json' }));
  app.use(json({ limit: '2mb' }));
  app.useGlobalFilters(new ZodExceptionFilter());
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = Number(process.env.API_PORT ?? 4000);
  app.enableShutdownHooks();
  await listen(app, port);
  console.log(`Motive Fashion API http://localhost:${port}/api/v1`);
}

async function listen(app: Awaited<ReturnType<typeof NestFactory.create>>, port: number) {
  const waits = [0, 250, 500, 1000, 1500];
  let last: unknown;
  for (const wait of waits) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      await app.listen(port);
      return;
    } catch (err) {
      last = err;
      const code = typeof err === 'object' && err && 'code' in err ? (err as NodeJS.ErrnoException).code : undefined;
      if (code !== 'EADDRINUSE') throw err;
    }
  }
  throw last;
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
