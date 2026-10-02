import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/locked/'],
    },
    sitemap: 'https://padx.vercel.app/sitemap.xml',
  };
}
