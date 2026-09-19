import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { finalize } from 'rxjs';
import { fireAlert } from './alerts';
import { httpLogLevel, recordHttp, shouldAlertHttp5xx } from './http-metrics';
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
        const status = res.statusCode;
        const ms = Date.now() - start;
        recordHttp(req.method, path, status, ms);
        emitLog(httpLogLevel(status), 'http.request', {
          method: req.method,
          path,
          status,
          ms,
        });
        if (status >= 500 && shouldAlertHttp5xx(path)) {
          void fireAlert(`HTTP ${status} ${req.method} ${path}`);
        }
      }),
    );
  }
}
