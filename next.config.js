/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ethers'],
  },
  images: {
    domains: [],
  },
}

module.exports = nextConfig
