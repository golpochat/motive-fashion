import { BRAND } from '@motive-fashion/config';

export const SHARE_CHANNELS = [
  'whatsapp',
  'facebook',
  'instagram',
  'x',
  'pinterest',
  'sms',
  'email',
  'copy',
  'native',
] as const;

export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export type SharePayload = {
  title: string;
  url: string;
  text?: string;
  image?: string;
};

export function siteOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export function absoluteUrl(pathOrUrl: string, origin = siteOrigin()) {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin.replace(/\/$/, '')}${path}`;
}

export function withShareUtm(url: string, channel: ShareChannel) {
  const next = new URL(url);
  next.searchParams.set('utm_source', channel);
  next.searchParams.set('utm_medium', 'share');
  next.searchParams.set('utm_campaign', 'product');
  return next.toString();
}

/** Title + URL only. Tracking params stay off the visible link — WhatsApp wraps them into a raw dump. */
export function shareCopy(payload: SharePayload, url: string) {
  return `${payload.title} from ${BRAND.name}\n${url}`;
}

export function shareHref(
  channel: Exclude<ShareChannel, 'copy' | 'native' | 'instagram'>,
  payload: SharePayload,
) {
  const url = payload.url;
  const text = shareCopy(payload, url);
  const tracked = withShareUtm(url, channel);
  switch (channel) {
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tracked)}`;
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.title)}&url=${encodeURIComponent(tracked)}`;
    case 'pinterest': {
      const params = new URLSearchParams({
        url: tracked,
        description: `${payload.title} · ${BRAND.name}`,
      });
      if (payload.image) params.set('media', payload.image);
      return `https://www.pinterest.com/pin/create/button/?${params.toString()}`;
    }
    case 'email':
      return `mailto:?subject=${encodeURIComponent(`${payload.title} · ${BRAND.name}`)}&body=${encodeURIComponent(text)}`;
    case 'sms':
      return `sms:?&body=${encodeURIComponent(text)}`;
  }
}

export function canUseNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
