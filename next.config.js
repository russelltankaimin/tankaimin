/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async ()=> {
    return [
      // Basic redirect
      {
        source: '/aboutme/:slug/',
        destination: '/resume',
        permanent: true,
      },
      // Wildcard path matching
      {
        source: '/docs/:slug/',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blog/uni/:slug/',
        destination: '/blog',
        permanent: true,
      },
    ]
  },
  reactStrictMode: true
}

module.exports = nextConfig
