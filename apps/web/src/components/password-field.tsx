'use client';

import { useId, useState } from 'react';
import { PASSWORD_MIN_LENGTH } from '@motive-fashion/config';
import { fieldClass } from '@/components/dashboard-ui';
import { Icon } from '@/components/icons';

export function PasswordField({
  name = 'password',
  label = 'Password',
  autoComplete,
  required = true,
  value,
  onChange,
  error,
  showRules,
  accessory,
}: {
  name?: string;
  label?: string;
  autoComplete?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  showRules?: boolean;
  accessory?: JSX.Element | null;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const [visible, setVisible] = useState(false);
  const remaining = Math.max(0, PASSWORD_MIN_LENGTH - value.length);
  const longEnough = remaining === 0 && value.length > 0;

  let help = `Use at least ${PASSWORD_MIN_LENGTH} characters. A short sentence is stronger than a complex word.`;
  if (value.length > 0 && remaining > 0) {
    help =
      remaining === 1
        ? `1 more character needed. Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`
        : `${remaining} more characters needed. Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (longEnough) {
    help = `At least ${PASSWORD_MIN_LENGTH} characters — that meets our minimum.`;
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block text-sm text-ink/70">
          {label}
        </label>
        {accessory}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          value={value}
          autoComplete={autoComplete}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : showRules ? helpId : undefined}
          className={`${fieldClass} pr-11`}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink/45 hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((open) => !open)}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} className="h-4 w-4" />
        </button>
      </div>
      {showRules && !error ? (
        <p id={helpId} className={`mt-1.5 text-xs ${remaining > 0 && value.length > 0 ? 'text-red-700' : 'text-ink/50'}`}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
