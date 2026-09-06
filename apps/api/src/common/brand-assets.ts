import { existsSync, readFileSync } from 'fs';
import path from 'path';

export function brandMarkPng(): Buffer | null {
  const candidates = [
    path.resolve(__dirname, '../../../web/public/brand/mark.png'),
    path.resolve(process.cwd(), '../web/public/brand/mark.png'),
    path.resolve(process.cwd(), 'apps/web/public/brand/mark.png'),
  ];
  for (const file of candidates) {
    if (existsSync(file)) return readFileSync(file);
  }
  return null;
}
