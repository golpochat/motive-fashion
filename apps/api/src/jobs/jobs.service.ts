import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { CartService } from '../modules/cart/cart.service';
import { StockService } from '../modules/inventory/stock.service';

function connection() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new IORedis(url, { maxRetriesPerRequest: null });
}

@Injectable()
export class JobsService {
  private queue?: Queue;

  constructor(
    private readonly carts: CartService,
    private readonly stock: StockService,
  ) {
    try {
      this.queue = new Queue('motive-jobs', { connection: connection() });
    } catch {
      this.queue = undefined;
    }
  }

  async startWorker() {
    const conn = connection();
    const worker = new Worker(
      'motive-jobs',
      async (job) => {
        if (job.name === 'expire-carts') return this.carts.expireStale();
        if (job.name === 'low-stock') return this.stock.restockSuggestions();
        return null;
      },
      { connection: conn },
    );
    return worker;
  }
}
