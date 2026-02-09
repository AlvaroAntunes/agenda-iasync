/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:8000"

const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/uazapi/:path*",
        destination: `${backendUrl}/uazapi/:path*`,
      },
      {
        source: "/sse/:path*",
        destination: `${backendUrl}/sse/:path*`,
      },
    ]
  },
}

export default nextConfig
