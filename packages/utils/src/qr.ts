/**
 * Byte-mode QR, ECC M, versions 1–6. Enough for a product URL on a hang tag.
 * No npm barcode library — scanners read this the same as any other QR.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255]!;
})();

function gfMul(a: number, b: number) {
  if (!a || !b) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

/** ECC-M: [version] = { dataCodewords, groups: [blocks, dataPerBlock][] } */
const VERSIONS: { data: number; groups: [number, number][]; ec: number }[] = [
  { data: 16, ec: 10, groups: [[1, 16]] },
  { data: 28, ec: 16, groups: [[1, 28]] },
  { data: 44, ec: 26, groups: [[1, 44]] },
  { data: 64, ec: 18, groups: [[2, 32]] },
  { data: 86, ec: 24, groups: [[2, 43]] },
  { data: 108, ec: 16, groups: [[4, 27]] },
];

const ALIGN = [[], [18], [22], [26], [30], [34]];
const REMAINDER = [0, 7, 7, 7, 7, 7];
const BYTE_CAP = [14, 26, 42, 62, 84, 106];

function rsGenerator(ecCount: number) {
  let poly = [1];
  for (let i = 0; i < ecCount; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      const coef = poly[j] ?? 0;
      next[j] = (next[j] ?? 0) ^ coef;
      next[j + 1] = (next[j + 1] ?? 0) ^ gfMul(coef, GF_EXP[i] ?? 0);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecCount: number) {
  const gen = rsGenerator(ecCount);
  const ecc = new Array<number>(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ ecc[0]!;
    ecc.shift();
    ecc.push(0);
    if (!factor) continue;
    for (let i = 0; i < ecCount; i += 1) {
      ecc[i] = (ecc[i] ?? 0) ^ gfMul(gen[i + 1] ?? 0, factor);
    }
  }
  return ecc;
}

function chooseVersion(bytes: number) {
  const index = BYTE_CAP.findIndex((cap) => cap >= bytes);
  if (index < 0) throw new Error('QR payload is too long for hang-tag versions');
  return index + 1;
}

function encodeData(text: string, version: number) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const spec = VERSIONS[version - 1]!;
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const byte of bytes) push(byte, 8);
  const capacity = spec.data * 8;
  const term = Math.min(4, capacity - bits.length);
  push(0, term);
  while (bits.length % 8) bits.push(0);
  const pads = [0xec, 0x11];
  let pad = 0;
  while (bits.length < capacity) {
    push(pads[pad % 2]!, 8);
    pad += 1;
  }
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j]!;
    codewords.push(v);
  }
  return codewords;
}

function errorBlocks(data: number[], version: number) {
  const spec = VERSIONS[version - 1]!;
  const blocks: { data: number[]; ecc: number[] }[] = [];
  let offset = 0;
  for (const [count, dataLen] of spec.groups) {
    for (let i = 0; i < count; i += 1) {
      const slice = data.slice(offset, offset + dataLen);
      offset += dataLen;
      blocks.push({ data: slice, ecc: rsEncode(slice, spec.ec) });
    }
  }
  const interleaved: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i += 1) {
    for (const block of blocks) {
      if (i < block.data.length) interleaved.push(block.data[i]!);
    }
  }
  const maxEcc = spec.ec;
  for (let i = 0; i < maxEcc; i += 1) {
    for (const block of blocks) interleaved.push(block.ecc[i]!);
  }
  return interleaved;
}

function sizeOf(version: number) {
  return 21 + 4 * (version - 1);
}

function setFinder(grid: number[][], reserved: boolean[][], row: number, col: number) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= grid.length || cc >= grid.length) continue;
      const inFinder = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const dark =
        inFinder &&
        (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      grid[rr]![cc] = dark ? 1 : 0;
      reserved[rr]![cc] = true;
    }
  }
}

function setAlignment(grid: number[][], reserved: boolean[][], version: number) {
  const positions = ALIGN[version - 1]!;
  const coords = [6, ...positions];
  for (const row of coords) {
    for (const col of coords) {
      if (
        (row === 6 && col === 6) ||
        (row === 6 && col === grid.length - 7) ||
        (row === grid.length - 7 && col === 6)
      ) {
        continue;
      }
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const dark = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          grid[row + r]![col + c] = dark ? 1 : 0;
          reserved[row + r]![col + c] = true;
        }
      }
    }
  }
}

function maskBit(mask: number, row: number, col: number) {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function formatBits(mask: number) {
  let data = mask;
  let d = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((d >>> i) & 1) d ^= 0x537 << (i - 10);
  }
  return ((data << 10) | (d & 0x3ff)) ^ 0x5412;
}

function placeFormat(grid: number[][], reserved: boolean[][], mask: number) {
  const bits = formatBits(mask);
  const n = grid.length;
  const bit = (i: number) => (bits >>> i) & 1;
  const set = (row: number, col: number, i: number) => {
    grid[row]![col] = bit(i);
    reserved[row]![col] = true;
  };
  for (let i = 0; i <= 5; i += 1) set(8, i, i);
  set(8, 7, 6);
  set(8, 8, 7);
  set(7, 8, 8);
  for (let i = 9; i <= 14; i += 1) set(14 - i, 8, i);
  for (let i = 0; i <= 7; i += 1) set(n - 1 - i, 8, i);
  for (let i = 8; i <= 14; i += 1) set(8, n - 15 + i, i);
}

function penalty(grid: number[][]) {
  const n = grid.length;
  let score = 0;
  for (let r = 0; r < n; r += 1) {
    let run = 1;
    for (let c = 1; c <= n; c += 1) {
      if (c < n && grid[r]![c] === grid[r]![c - 1]) run += 1;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
  }
  for (let c = 0; c < n; c += 1) {
    let run = 1;
    for (let r = 1; r <= n; r += 1) {
      if (r < n && grid[r]![c] === grid[r - 1]![c]) run += 1;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
  }
  for (let r = 0; r < n - 1; r += 1) {
    for (let c = 0; c < n - 1; c += 1) {
      const v = grid[r]![c];
      if (v === grid[r]![c + 1] && v === grid[r + 1]![c] && v === grid[r + 1]![c + 1]) score += 3;
    }
  }
  const finder = [1, 0, 1, 1, 1, 0, 1];
  const hasFinder = (line: number[], start: number) =>
    finder.every((bit, i) => line[start + i] === bit);
  for (let r = 0; r < n; r += 1) {
    const row = grid[r]!;
    for (let c = 0; c <= n - 7; c += 1) {
      if (!hasFinder(row, c)) continue;
      const left = c >= 4 && row.slice(c - 4, c).every((v) => v === 0);
      const right = c + 11 <= n && row.slice(c + 7, c + 11).every((v) => v === 0);
      if (left || right) score += 40;
    }
  }
  for (let c = 0; c < n; c += 1) {
    const col = grid.map((row) => row[c]!);
    for (let r = 0; r <= n - 7; r += 1) {
      if (!hasFinder(col, r)) continue;
      const up = r >= 4 && col.slice(r - 4, r).every((v) => v === 0);
      const down = r + 11 <= n && col.slice(r + 7, r + 11).every((v) => v === 0);
      if (up || down) score += 40;
    }
  }
  let dark = 0;
  for (const row of grid) for (const cell of row) dark += cell;
  score += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return score;
}

function buildReserved(version: number) {
  const n = sizeOf(version);
  const grid = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const reserved = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  setFinder(grid, reserved, 0, 0);
  setFinder(grid, reserved, 0, n - 7);
  setFinder(grid, reserved, n - 7, 0);
  setAlignment(grid, reserved, version);
  for (let i = 8; i < n - 8; i += 1) {
    grid[6]![i] = i % 2 === 0 ? 1 : 0;
    grid[i]![6] = i % 2 === 0 ? 1 : 0;
    reserved[6]![i] = true;
    reserved[i]![6] = true;
  }
  grid[n - 8]![8] = 1;
  reserved[n - 8]![8] = true;
  placeFormat(grid, reserved, 0);
  return { grid, reserved };
}

function placeData(grid: number[][], reserved: boolean[][], bits: number[], mask: number) {
  const n = grid.length;
  let bit = 0;
  let up = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let i = 0; i < n; i += 1) {
      const row = up ? n - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (reserved[row]![c]) continue;
        const value = bit < bits.length ? bits[bit]! : 0;
        bit += 1;
        const dark = value ? 1 : 0;
        grid[row]![c] = maskBit(mask, row, c) ? dark ^ 1 : dark;
      }
    }
    up = !up;
  }
}

function toBits(codewords: number[], remainder: number) {
  const bits: number[] = [];
  for (const byte of codewords) {
    for (let i = 7; i >= 0; i -= 1) bits.push((byte >>> i) & 1);
  }
  for (let i = 0; i < remainder; i += 1) bits.push(0);
  return bits;
}

export function qrModules(text: string) {
  const bytes = new TextEncoder().encode(text).length;
  const version = chooseVersion(bytes);
  const data = encodeData(text, version);
  const codewords = errorBlocks(data, version);
  const bits = toBits(codewords, REMAINDER[version - 1]!);
  const n = sizeOf(version);
  let best: number[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const { grid, reserved } = buildReserved(version);
    placeData(grid, reserved, bits, mask);
    placeFormat(grid, reserved, mask);
    const score = penalty(grid);
    if (score < bestScore) {
      bestScore = score;
      best = grid.map((row) => row.slice());
    }
  }
  return best!.map((row) => row.map((cell) => cell === 1));
}

export function qrVersionFor(text: string) {
  return chooseVersion(new TextEncoder().encode(text).length);
}

export function qrSize(version: number) {
  return sizeOf(version);
}
