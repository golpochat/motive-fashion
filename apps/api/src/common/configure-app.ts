import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, raw, type NextFunction, type Request, type Response } from 'express';
import { ZodExceptionFilter } from './zod-exception.filter';
import { rateLimit, requestIdMiddleware, securityHeaders } from './http';
import { HttpLogInterceptor } from './http-log.interceptor';
import { JsonLogger } from './log';
import { isProduction } from './security-config';

export function configureApp(app: INestApplication, options?: { jsonLogs?: boolean }) {
  if (isProduction()) {
    const http = app.getHttpAdapter().getInstance() as { set?: (key: string, value: unknown) => void };
    http.set?.('trust proxy', 1);
  }
  if (options?.jsonLogs !== false) {
    app.useLogger(new JsonLogger());
  }
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
  app.useGlobalInterceptors(new HttpLogInterceptor());
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
  app.enableShutdownHooks();
}
