import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './common/configure-app';
import { emitLog, JsonLogger } from './common/log';

async function bootstrap() {
  process.env.LOG_SERVICE ??= 'api';
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true, logger: new JsonLogger() });
  configureApp(app);
  const port = Number(process.env.API_PORT ?? 4000);
  await listen(app, port);
  emitLog('info', 'api listening', { port, prefix: process.env.API_PREFIX ?? 'api/v1' });
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
  emitLog('error', 'api failed to start', { detail: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
