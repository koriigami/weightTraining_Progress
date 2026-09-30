import type { MetadataRoute } from 'next';

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://weight-training-progress.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${site}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${site}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
