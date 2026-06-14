/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
  },
  // FIX: was ignoreDuringBuilds: true — real code errors would slip through undetected
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
}

module.exports = nextConfig
