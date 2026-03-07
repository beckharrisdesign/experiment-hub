import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://simple-seed-organizer.vercel.app';

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
