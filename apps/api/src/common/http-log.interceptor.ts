import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { finalize } from 'rxjs';
import { emitLog } from './log';

@Injectable()
export class HttpLogInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();
    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
    return next.handle().pipe(
      finalize(() => {
        emitLog('info', 'http.request', {
          method: req.method,
          path,
          status: res.statusCode,
          ms: Date.now() - start,
        });
      }),
    );
  }
}
