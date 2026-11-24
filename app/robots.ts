import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/sign-in',
          '/sign-up',
          '/forgot-password',
          '/reset-password',
          '/game',
          '/leaderboard',
          '/laporan',
          '/laporan-kader',
        ],
      },
    ],
    sitemap: 'https://adiwiyata55-cwpr.vercel.app/sitemap.xml',
  }
}
