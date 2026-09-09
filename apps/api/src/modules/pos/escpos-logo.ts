import { inflateSync } from 'zlib';

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readChunks(png: Buffer) {
  if (png.length < 8 || !png.subarray(0, 8).equals(PNG_SIG)) return null;
  const chunks = new Map<string, Buffer[]>();
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    const list = chunks.get(type) ?? [];
    list.push(Buffer.from(data));
    chunks.set(type, list);
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

function unfilter(data: Buffer, width: number, height: number, bpp: number) {
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let src = 0;
  let dst = 0;
  for (let y = 0; y < height; y++) {
    const filter = data[src++];
    for (let x = 0; x < stride; x++) {
      const raw = data[src++];
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y > 0 ? out[dst + x - stride] : 0;
      const c = y > 0 && x >= bpp ? out[dst + x - stride - bpp] : 0;
      let val = raw;
      if (filter === 1) val = (raw + a) & 255;
      else if (filter === 2) val = (raw + b) & 255;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) val = (raw + paeth(a, b, c)) & 255;
      out[dst + x] = val;
    }
    dst += stride;
  }
  return out;
}

function lumaAt(pixels: Buffer, i: number, bpp: number, palette?: Buffer) {
  if (bpp === 1 && palette) {
    const idx = pixels[i] * 3;
    return (palette[idx] + palette[idx + 1] + palette[idx + 2]) / 3;
  }
  if (bpp === 1) return pixels[i];
  if (bpp === 2) return pixels[i];
  return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
}

function toMono(pixels: Buffer, width: number, height: number, bpp: number, palette?: Buffer) {
  const bits = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * bpp;
      bits[y * width + x] = lumaAt(pixels, i, bpp, palette) < 200 ? 1 : 0;
    }
  }
  return bits;
}

function scale(src: Uint8Array, sw: number, sh: number, dw: number, dh: number) {
  const out = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / dw));
      out[y * dw + x] = src[sy * sw + sx];
    }
  }
  return out;
}

function packBits(bits: Uint8Array, width: number, height: number) {
  const rowBytes = Math.ceil(width / 8);
  const out = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (bits[y * width + x]) out[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return { bytes: out, rowBytes };
}

function monoToEscPos(bits: Uint8Array, width: number, height: number) {
  const dw = Math.max(8, width & ~7);
  const scaled = dw === width ? bits : scale(bits, width, height, dw, height);
  const { bytes, rowBytes } = packBits(scaled, dw, height);
  return Buffer.concat([
    Buffer.from([0x1d, 0x76, 0x30, 0, rowBytes & 255, rowBytes >> 8, height & 255, height >> 8]),
    bytes,
    Buffer.from('\n', 'ascii'),
  ]);
}

class Bitmap {
  bits: Uint8Array;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.bits = new Uint8Array(w * h);
  }
  fill(x: number, y: number, w: number, h: number) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w));
    const y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.bits[yy * this.w + xx] = 1;
    }
  }
  disc(cx: number, cy: number, radius: number) {
    const r = Math.max(1, radius);
    const r2 = r * r;
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + r));
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + r));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.bits[y * this.w + x] = 1;
      }
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, r: number) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r);
    }
  }
}

function drawO(bmp: Bitmap, x: number, y: number, w: number, h: number, s: number) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const y0 = Math.max(0, Math.floor(y));
  const y1 = Math.min(bmp.h, Math.ceil(y + h));
  const x0 = Math.max(0, Math.floor(x));
  const x1 = Math.min(bmp.w, Math.ceil(x + w));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const dx = xx + 0.5 - cx;
      const dy = yy + 0.5 - cy;
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1) continue;
      const nxi = dx / Math.max(1, rx - s);
      const nyi = dy / Math.max(1, ry - s);
      if (nxi * nxi + nyi * nyi >= 1) bmp.bits[yy * bmp.w + xx] = 1;
    }
  }
}

function glyphWidth(ch: string, h: number) {
  if (ch === ' ') return Math.round(h * 0.34);
  if (ch === 'I') return Math.round(h * 0.34);
  if (ch === 'M' || ch === 'W') return Math.round(h * 0.9);
  return Math.round(h * 0.62);
}

function drawGlyph(bmp: Bitmap, ch: string, x: number, y: number, w: number, h: number) {
  const s = Math.max(4, Math.round(h * 0.18));
  const r = s / 2;
  const mid = y + h * 0.48;
  if (ch === ' ') return;
  if (ch === 'A') {
    bmp.line(x + r, y + h, x + w / 2, y + r, r);
    bmp.line(x + w - r, y + h, x + w / 2, y + r, r);
    bmp.fill(x + w * 0.22, mid, w * 0.56, s);
    return;
  }
  if (ch === 'E') {
    bmp.fill(x, y, s, h);
    bmp.fill(x, y, w, s);
    bmp.fill(x, mid - s / 2, w * 0.78, s);
    bmp.fill(x, y + h - s, w, s);
    return;
  }
  if (ch === 'F') {
    bmp.fill(x, y, s, h);
    bmp.fill(x, y, w, s);
    bmp.fill(x, mid - s / 2, w * 0.78, s);
    return;
  }
  if (ch === 'H') {
    bmp.fill(x, y, s, h);
    bmp.fill(x + w - s, y, s, h);
    bmp.fill(x, mid - s / 2, w, s);
    return;
  }
  if (ch === 'I') {
    bmp.fill(x + (w - s) / 2, y, s, h);
    return;
  }
  if (ch === 'M') {
    bmp.fill(x, y, s, h);
    bmp.fill(x + w - s, y, s, h);
    bmp.line(x + s, y + r, x + w / 2, y + h * 0.58, r);
    bmp.line(x + w - s, y + r, x + w / 2, y + h * 0.58, r);
    return;
  }
  if (ch === 'N') {
    bmp.fill(x, y, s, h);
    bmp.fill(x + w - s, y, s, h);
    bmp.line(x + r, y + r, x + w - r, y + h - r, r);
    return;
  }
  if (ch === 'O') {
    drawO(bmp, x, y, w, h, s);
    return;
  }
  if (ch === 'S') {
    bmp.fill(x, y, w, s);
    bmp.fill(x, y, s, h * 0.5);
    bmp.fill(x, mid - s / 2, w, s);
    bmp.fill(x + w - s, mid, s, h * 0.5);
    bmp.fill(x, y + h - s, w, s);
    bmp.disc(x + r, y + r, r);
    bmp.disc(x + w - r, y + h - r, r);
    return;
  }
  if (ch === 'T') {
    bmp.fill(x, y, w, s);
    bmp.fill(x + (w - s) / 2, y, s, h);
    return;
  }
  if (ch === 'V') {
    bmp.line(x + r, y + r, x + w / 2, y + h - r, r);
    bmp.line(x + w - r, y + r, x + w / 2, y + h - r, r);
    return;
  }
  bmp.fill(x, y, w, h);
}

function measureWordmark(text: string, h: number) {
  const gap = Math.round(h * 0.16);
  const chars = [...text];
  let width = 0;
  for (let i = 0; i < chars.length; i++) {
    width += glyphWidth(chars[i] ?? ' ', h);
    if (i < chars.length - 1 && chars[i] !== ' ' && chars[i + 1] !== ' ') width += gap;
  }
  return { chars, gap, width };
}

function drawLine(bmp: Bitmap, text: string, originX: number, y: number, h: number) {
  const layout = measureWordmark(text, h);
  let x = originX;
  for (let i = 0; i < layout.chars.length; i++) {
    const ch = layout.chars[i] ?? ' ';
    const gw = glyphWidth(ch, h);
    drawGlyph(bmp, ch, x, y, gw, h);
    x += gw;
    if (i < layout.chars.length - 1 && ch !== ' ' && layout.chars[i + 1] !== ' ') x += layout.gap;
  }
}

/** Geometric wordmark as GS v 0 — same raster language as the mark, not the till font. */
export function wordmarkToEscPosRaster(text = 'MOTIVE FASHION', maxWidth = 512) {
  try {
    return renderWordmark(text, maxWidth);
  } catch {
    return null;
  }
}

function renderWordmark(text: string, maxWidth: number) {
  const pad = 8;
  const lineGap = 10;
  const lines = text.split(/\s+/).filter(Boolean);
  let h = 80;
  let measured = lines.map((line) => measureWordmark(line, h));
  let maxLine = Math.max(...measured.map((line) => line.width), 1);
  if (maxLine + pad * 2 > maxWidth) {
    h = Math.max(36, Math.round((h * (maxWidth - pad * 2)) / maxLine));
    measured = lines.map((line) => measureWordmark(line, h));
    maxLine = Math.max(...measured.map((line) => line.width), 1);
  }
  const srcW = maxLine + pad * 2;
  const srcH = lines.length * h + Math.max(0, lines.length - 1) * lineGap + pad * 2;
  const bmp = new Bitmap(srcW, srcH);
  let y = pad;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const width = measured[i]?.width ?? 0;
    drawLine(bmp, line, Math.round((srcW - width) / 2), y, h);
    y += h + lineGap;
  }
  const dw = Math.min(maxWidth, srcW) & ~7;
  const dh = Math.max(8, Math.round((srcH * dw) / srcW));
  const bits = dw === srcW && dh === srcH ? bmp.bits : scale(bmp.bits, srcW, srcH, dw, dh);
  return monoToEscPos(bits, dw, dh);
}

/** GS v 0 raster of a PNG. Dark pixels burn (logo fill); light pixels stay paper. */
export function pngToEscPosRaster(png: Buffer, maxWidth = 384) {
  try {
    return rasterize(png, maxWidth);
  } catch {
    return null;
  }
}

function rasterize(png: Buffer, maxWidth: number) {
  const chunks = readChunks(png);
  const ihdr = chunks?.get('IHDR')?.[0];
  const idat = chunks?.get('IDAT');
  if (!ihdr || !idat?.length) return null;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (bitDepth !== 8 || interlace !== 0 || width < 1 || height < 1) return null;
  const bpp = colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : colorType === 3 || colorType === 0 ? 1 : 0;
  if (!bpp) return null;
  const inflated = inflateSync(Buffer.concat(idat));
  const pixels = unfilter(inflated, width, height, bpp);
  const palette = colorType === 3 ? chunks.get('PLTE')?.[0] : undefined;
  const mono = toMono(pixels, width, height, bpp, palette);
  const dw = Math.min(maxWidth, width) & ~7;
  const dh = Math.max(1, Math.round((height * dw) / width));
  const scaled = dw === width && dh === height ? mono : scale(mono, width, height, dw, dh);
  const { bytes, rowBytes } = packBits(scaled, dw, dh);
  return Buffer.concat([
    Buffer.from([0x1d, 0x76, 0x30, 0, rowBytes & 255, rowBytes >> 8, dh & 255, dh >> 8]),
    bytes,
    Buffer.from('\n', 'ascii'),
  ]);
}
