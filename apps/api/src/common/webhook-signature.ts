import { createHmac, timingSafeEqual } from 'crypto';

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function metaSignatureValid(rawBody: Buffer, header: string | undefined, appSecret: string) {
  if (!header?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return safeEqual(header, expected);
}

export function squareSignatureValid(
  rawBody: Buffer,
  header: string | undefined,
  signatureKey: string,
  notificationUrl: string,
) {
  if (!header) return false;
  const expected = createHmac('sha256', signatureKey)
    .update(notificationUrl + rawBody.toString('utf8'))
    .digest('base64');
  return safeEqual(header, expected);
}

export function requestRawBody(req: { rawBody?: Buffer; body?: unknown }): Buffer {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  return Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));
}
