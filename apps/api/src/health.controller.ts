import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import IORedis from 'ioredis';
import { PrismaService } from './prisma/prisma.service';

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
      throw new ServiceUnavailableException('database unavailable');
    }
    const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    try {
      const pong = await redis.ping();
      if (pong !== 'PONG') throw new Error('redis');
    } catch {
      throw new ServiceUnavailableException('redis unavailable');
    } finally {
      redis.disconnect();
    }
    return { ok: true, service: 'motive-fashion-api', database: 'up', redis: 'up' };
  }
}
