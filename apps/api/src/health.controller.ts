import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { emitLog } from './common/log';
import { withRedis } from './common/redis';

@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  ok() {
    return { ok: true, service: 'motive-fashion-api' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      emitLog('error', 'ready probe failed', { probe: 'database' });
      throw new ServiceUnavailableException('database unavailable');
    }
    const pong = await withRedis((redis) => redis.ping(), '');
    if (pong !== 'PONG') {
      emitLog('error', 'ready probe failed', { probe: 'redis' });
      throw new ServiceUnavailableException('redis unavailable');
    }
    return { ok: true, service: 'motive-fashion-api', database: 'up', redis: 'up' };
  }

  @Get('metrics')
  metrics() {
    const mem = process.memoryUsage();
    return {
      ok: true,
      service: 'motive-fashion-api',
      uptimeSec: Math.round(process.uptime()),
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      node: process.version,
    };
  }
}
