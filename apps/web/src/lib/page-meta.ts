import type { Metadata } from 'next';
import { BRAND } from '@motive-fashion/config';
import { absoluteUrl } from '@/lib/share';

export function pageMeta(title: string, description: string, image?: string): Metadata {
  const imageUrl = image ? absoluteUrl(image) : undefined;
  return {
    title,
    description,
    openGraph: {
      title: `${title} · ${BRAND.name}`,
      description,
      siteName: BRAND.name,
      locale: 'en_IE',
      images: imageUrl ? [{ url: imageUrl, alt: title }] : undefined,
    },
    twitter: imageUrl ? { card: 'summary_large_image', title, description, images: [imageUrl] } : undefined,
  };
}
