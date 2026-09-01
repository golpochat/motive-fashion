import { MetadataRoute } from 'next';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/shop', '/about', '/contact', '/size-guide', '/legal/terms', '/legal/privacy', '/legal/returns', '/legal/cookies'];
  return paths.map((path) => ({ url: `${site}${path}`, changeFrequency: 'weekly', priority: path === '' ? 1 : 0.6 }));
}
