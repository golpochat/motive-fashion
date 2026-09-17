'use client';

import { useId, useState } from 'react';

const STAR_PATH = 'M12 3.2 14.8 8.9l6.3.6-4.8 4.1 1.5 6.1L12 16.7 6.2 19.7l1.5-6.1-4.8-4.1 6.3-.6Z';

function StarMark({ filled, className = 'h-5 w-5' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d={STAR_PATH}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RatingStars({
  value,
  size = 'md',
}: {
  value: number;
  size?: 'sm' | 'md';
}) {
  const filledTo = Math.round(Math.min(5, Math.max(0, value)));
  const label = Number.isInteger(value) ? `${value} out of 5` : `${value.toFixed(1)} out of 5`;
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className="inline-flex items-center gap-0.5 text-accent" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarMark key={n} filled={n <= filledTo} className={`${icon} ${n <= filledTo ? 'text-accent' : 'text-ink/20'}`} />
      ))}
    </span>
  );
}

export function RatingInput({
  name = 'rating',
  defaultValue = 5,
}: {
  name?: string;
  defaultValue?: number;
}) {
  const legendId = useId();
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="min-w-0">
      <legend id={legendId} className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">
        Rating
      </legend>
      <div
        className="flex"
        role="radiogroup"
        aria-labelledby={legendId}
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= shown;
          return (
            <label
              key={n}
              className={`flex h-11 w-11 cursor-pointer items-center justify-center ${filled ? 'text-accent' : 'text-ink/20'}`}
              onMouseEnter={() => setHover(n)}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                required={n === 1}
                className="sr-only"
                onChange={() => setValue(n)}
              />
              <StarMark filled={filled} className="h-6 w-6" />
              <span className="sr-only">
                {n} out of 5
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
