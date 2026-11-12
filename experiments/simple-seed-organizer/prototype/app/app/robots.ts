import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/terms', '/privacy', '/login', '/forgot-password'],
        disallow: ['/profile', '/seeds/', '/add', '/reset-password', '/packet-extraction-test/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
