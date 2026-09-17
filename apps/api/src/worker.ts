import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JobsService } from './jobs/jobs.service';
import { emitLog, JsonLogger } from './common/log';
import { fireAlert } from './common/alerts';

async function run() {
  process.env.LOG_SERVICE ??= 'worker';
  const app = await NestFactory.createApplicationContext(AppModule, { logger: new JsonLogger() });
  const jobs = app.get(JobsService);
  await jobs.startWorker();
}

run().catch((err) => {
  const detail = err instanceof Error ? err.message : String(err);
  emitLog('error', 'worker failed to start', { detail });
  void fireAlert('Motive Fashion worker failed to start', detail).finally(() => process.exit(1));
});
