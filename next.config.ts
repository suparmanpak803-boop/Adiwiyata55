import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Gambar slider & dokumen disajikan dari route sendiri / Vercel Blob.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.blob.vercel-storage.com' }],
  },
  // M-01: security headers. CSP disesuaikan dengan kebutuhan nyata
  // aplikasi: iframe video edukasi (youtube-nocookie), alur Google
  // OAuth, gambar dari Vercel Blob, widget Cloudflare Turnstile
  // di halaman masuk/daftar, dan tag GA4 (googletagmanager +
  // google-analytics). Bila login/slider rusak setelah
  // deploy, periksa console browser untuk pelanggaran CSP.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://apis.google.com https://challenges.cloudflare.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              'frame-src https://www.youtube-nocookie.com https://accounts.google.com https://challenges.cloudflare.com',
              "connect-src 'self' https://*.blob.vercel-storage.com https://challenges.cloudflare.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
              "media-src 'self' https:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
