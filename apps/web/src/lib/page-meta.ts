import type { Metadata } from 'next';
import { BRAND } from '@motive-fashion/config';

export function pageMeta(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} · ${BRAND.name}`,
      description,
    },
  };
}
