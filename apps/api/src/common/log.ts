import { AsyncLocalStorage } from 'async_hooks';
import type { LoggerService } from '@nestjs/common';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

const LEVEL_RANK: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

function minLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  if (raw === 'debug' || raw === 'warn' || raw === 'error' || raw === 'info') return raw;
  return 'info';
}

export function formatLog(level: LogLevel, msg: string, fields: LogFields = {}) {
  const requestId = fields.requestId ?? requestContext.getStore()?.requestId;
  return {
    ts: new Date().toISOString(),
    level,
    msg,
    service: process.env.LOG_SERVICE ?? 'api',
    ...(requestId ? { requestId } : {}),
    ...fields,
  };
}

export function emitLog(level: LogLevel, msg: string, fields: LogFields = {}) {
  if (LEVEL_RANK[level] > LEVEL_RANK[minLevel()]) return;
  const line = `${JSON.stringify(formatLog(level, msg, fields))}\n`;
  if (level === 'error') process.stderr.write(line);
  else process.stdout.write(line);
}

function contextName(optional: unknown[]) {
  const strings = optional.filter((value): value is string => typeof value === 'string');
  const stack = strings.find((value) => value.includes('\n'));
  const context = strings.find((value) => value !== stack);
  return { context, stack };
}

/** JSON logs on stdout/stderr so a host log drain (CloudWatch, Datadog, Axiom) can ingest them. */
export class JsonLogger implements LoggerService {
  log(message: unknown, ...optional: unknown[]) {
    const { context } = contextName(optional);
    emitLog('info', String(message), context ? { context } : {});
  }

  error(message: unknown, ...optional: unknown[]) {
    const { context, stack } = contextName(optional);
    emitLog('error', String(message), {
      ...(context ? { context } : {}),
      ...(stack ? { stack } : {}),
    });
  }

  warn(message: unknown, ...optional: unknown[]) {
    const { context } = contextName(optional);
    emitLog('warn', String(message), context ? { context } : {});
  }

  debug(message: unknown, ...optional: unknown[]) {
    const { context } = contextName(optional);
    emitLog('debug', String(message), context ? { context } : {});
  }

  verbose(message: unknown, ...optional: unknown[]) {
    const { context } = contextName(optional);
    emitLog('debug', String(message), context ? { context } : {});
  }

  fatal(message: unknown, ...optional: unknown[]) {
    this.error(message, ...optional);
  }
}
