import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Gambar slider & dokumen disajikan dari route sendiri / Vercel Blob.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.blob.vercel-storage.com' }],
  },
}

export default nextConfig
