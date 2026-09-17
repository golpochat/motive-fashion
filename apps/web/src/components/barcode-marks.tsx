'use client';

import { encodeCode128Modules, qrModules } from '@motive-fashion/utils';

export function Code128Mark({ value, label }: { value: string; label?: string }) {
  const modules = encodeCode128Modules(value);
  return (
    <svg
      viewBox={`0 0 ${modules.length} 40`}
      className="h-12 w-full"
      role="img"
      aria-label={label ?? value}
    >
      {modules.map((on, i) =>
        on ? <rect key={i} x={i} y={0} width={1} height={40} className="fill-ink" /> : null,
      )}
    </svg>
  );
}

export function QrMark({ value, label }: { value: string; label?: string }) {
  const grid = qrModules(value);
  const n = grid.length;
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="h-24 w-24" role="img" aria-label={label ?? 'QR code'}>
      {grid.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} className="fill-ink" /> : null,
        ),
      )}
    </svg>
  );
}
