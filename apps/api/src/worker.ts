import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JobsService } from './jobs/jobs.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jobs = app.get(JobsService);
  await jobs.startWorker();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
