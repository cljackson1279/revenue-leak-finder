import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Disallow authenticated app routes and API endpoints
        disallow: ['/app/', '/api/'],
      },
    ],
    sitemap: 'https://medicalrouter.com/sitemap.xml',
  }
}
