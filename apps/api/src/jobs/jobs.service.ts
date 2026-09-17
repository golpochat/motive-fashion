import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { CartService } from '../modules/cart/cart.service';
import { StockService } from '../modules/inventory/stock.service';
import { fireAlert } from '../common/alerts';

function connection() {
  return new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
}

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly log = new Logger(JobsService.name);
  private queue?: Queue;
  private worker?: Worker;
  private conn?: IORedis;

  constructor(
    @Inject(CartService) private readonly carts: CartService,
    @Inject(StockService) private readonly stock: StockService,
  ) {}

  private ensureQueue() {
    if (!this.queue) {
      this.conn = connection();
      this.queue = new Queue('motive-jobs', { connection: this.conn });
    }
    return this.queue;
  }

  async scheduleRepeating() {
    const queue = this.ensureQueue();
    await queue.upsertJobScheduler('expire-carts', { every: 60_000 }, { name: 'expire-carts' });
    await queue.upsertJobScheduler('low-stock', { every: 6 * 60 * 60 * 1000 }, { name: 'low-stock' });
  }

  async startWorker() {
    const conn = connection();
    this.worker = new Worker(
      'motive-jobs',
      async (job) => {
        if (job.name === 'expire-carts') return this.carts.expireStale();
        if (job.name === 'low-stock') {
          const rows = await this.stock.restockSuggestions();
          if (rows.length) this.log.log(`Low stock SKUs: ${rows.length}`);
          return rows.length;
        }
        return null;
      },
      {
        connection: conn,
        autorun: true,
      },
    );
    this.worker.on('failed', (job, err) => {
      const name = job?.name ?? 'unknown';
      this.log.error(`Job ${name} failed: ${err.message}`);
      void fireAlert(`Motive Fashion job failed: ${name}`, err.message);
    });
    await this.scheduleRepeating();
    this.log.log('Motive Fashion worker running');
    return this.worker;
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.conn?.disconnect();
  }
}
