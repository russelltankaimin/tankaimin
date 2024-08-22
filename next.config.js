/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async ()=> {
    return [
      // Basic redirect
      {
        source: '/aboutme/:slug/',
        destination: '/resume',
        permanent: false,
      },
      // Wildcard path matching
      {
        source: '/docs/:slug/',
        destination: '/blog',
        permanent: false,
      },
      {
        source: '/blog/uni/:slug/',
        destination: '/blog',
        permanent: false,
      },
    ]
  },
  reactStrictMode: true
}

module.exports = nextConfig
