import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

export function uploadDir() {
  const dir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveProductImage(file?: {
  buffer?: Buffer;
  path?: string;
  mimetype?: string;
  size?: number;
  originalname?: string;
}) {
  const fromDisk = file?.path && existsSync(file.path) ? readFileSync(file.path) : undefined;
  const buffer = file?.buffer?.length ? file.buffer : fromDisk;
  if (!buffer?.length) throw new BadRequestException('Choose an image file.');
  if ((file?.size ?? buffer.length) > 4_000_000) throw new BadRequestException('Images must be 4 MB or smaller.');
  const ext = ALLOWED.get(file?.mimetype ?? '');
  if (!ext) throw new BadRequestException('Use a JPEG, PNG, WebP, or GIF.');
  const name = `${randomUUID()}${ext}`;
  writeFileSync(join(uploadDir(), name), buffer);
  if (file?.path && existsSync(file.path)) unlinkSync(file.path);
  return { filename: name, url: `/api/v1/media/${name}` };
}
