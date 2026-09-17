'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/icons';
import {
  absoluteUrl,
  canUseNativeShare,
  shareCopy,
  shareHref,
  type ShareChannel,
  type SharePayload,
} from '@/lib/share';

type Props = {
  title: string;
  path: string;
  text?: string;
  image?: string;
  className?: string;
};

const CHANNELS: { id: ShareChannel; label: string; hint?: string; icon?: IconName }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram', hint: 'Copy link, then paste in Instagram' },
  { id: 'x', label: 'X' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'sms', label: 'Messages' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'copy', label: 'Copy link', icon: 'copy' },
];

export function ShareButton({ title, path, text, image, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [native, setNative] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNative(canUseNativeShare());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function payload(): SharePayload {
    return {
      title,
      text,
      url: absoluteUrl(path),
      image: image ? absoluteUrl(image) : undefined,
    };
  }

  async function copyText(value: string, notice: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.className = 'sr-only';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setNotice(notice);
  }

  async function copyLink(channel: Extract<ShareChannel, 'copy' | 'instagram'>) {
    const next = payload();
    if (channel === 'instagram') {
      await copyText(next.url, 'Link copied — paste it in Instagram');
      return;
    }
    await copyText(shareCopy(next, next.url), 'Copied title and link');
  }

  async function nativeShare() {
    const next = payload();
    try {
      await navigator.share({
        title: next.title,
        text: `${next.title} from Motive Fashion`,
        url: next.url,
      });
      setOpen(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      await copyLink('copy');
    }
  }

  async function choose(channel: ShareChannel) {
    setNotice('');
    if (channel === 'native') {
      await nativeShare();
      return;
    }
    if (channel === 'copy' || channel === 'instagram') {
      await copyLink(channel);
      return;
    }
    const href = shareHref(channel, payload());
    if (href.startsWith('mailto:') || href.startsWith('sms:')) {
      window.location.href = href;
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-surface/95 text-ink shadow-sm transition-colors hover:border-accent hover:text-accent ${className}`}
        aria-label="Share this piece"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setNotice('');
          setOpen((v) => !v);
        }}
      >
        <Icon name="share" className="h-5 w-5" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Share this piece"
          className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-ink/10 bg-white p-2 shadow-lg"
        >
          <p className="px-2 pb-1 pt-1.5 text-xs uppercase tracking-widest text-ink/45">Share</p>
          {CHANNELS.map((channel) => (
            <button
              key={channel.id}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-ink/5"
              onClick={() => void choose(channel.id)}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-ink">
                {channel.icon ? <Icon name={channel.icon} className="h-4 w-4" /> : <BrandMark name={channel.id} />}
              </span>
              <span>
                <span className="block">{channel.label}</span>
                {channel.hint ? <span className="block text-xs text-ink/50">{channel.hint}</span> : null}
              </span>
            </button>
          ))}
          {native ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-ink/5"
              onClick={() => void choose('native')}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-ink">
                <Icon name="share" className="h-4 w-4" />
              </span>
              More on this device
            </button>
          ) : null}
          {notice ? (
            <p className="px-2 pb-1 pt-1 text-xs text-accent" aria-live="polite">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BrandMark({ name }: { name: ShareChannel }) {
  const common = { viewBox: '0 0 24 24', className: 'h-4 w-4', 'aria-hidden': true as const };
  if (name === 'facebook') {
    return (
      <svg {...common}>
        <path
          fill="currentColor"
          d="M14.2 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4H17V5.2C16.6 5.1 15.7 5 14.7 5c-2.2 0-3.6 1.3-3.6 3.8v2.2H8.5v2.8h2.6V21h3.1Z"
        />
      </svg>
    );
  }
  if (name === 'instagram') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="16.6" cy="7.4" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'x') {
    return (
      <svg {...common}>
        <path fill="currentColor" d="M4 4h4.2l4 5.5L16.8 4H20l-6.4 7.4L20.4 20h-4.2l-4.4-6L7.2 20H4l6.8-7.8L4 4Z" />
      </svg>
    );
  }
  if (name === 'pinterest') {
    return (
      <svg {...common}>
        <path
          fill="currentColor"
          d="M12 3.5A8.5 8.5 0 0 0 7.2 19c.1-.7.4-1.8.7-2.6l2.4-9.1s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.8 1.5 1.8 1.8 0 3-1.9 3-4.7 0-2.4-1.8-4.2-4.3-4.2-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.1c0 .2-.2.3-.4.2-1.5-.7-2.4-2.8-2.4-4.5 0-3.7 2.7-7 7.7-7 4 0 7.2 2.9 7.2 6.7 0 4-2.5 7.2-6 7.2-1.2 0-2.3-.6-2.7-1.3l-.7 2.8c-.3 1-1 2.2-1.5 2.9A8.5 8.5 0 1 0 12 3.5Z"
        />
      </svg>
    );
  }
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 8.5h11A1.5 1.5 0 0 1 19 10v7.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5V10a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </svg>
  );
}
