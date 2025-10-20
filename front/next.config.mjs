/** @type {import('next').NextConfig} */

const nextConfig = {
  // Enable static export for GitHub Pages
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // For development, keep the rewrites
  async rewrites() {
    // Only apply rewrites in development
    if (process.env.NODE_ENV === 'development') {
      const apiTarget = "https://genome.crg.es/annotrieve/api/v0"
      const nginxTarget = "https://genome.crg.es/annotrieve"
      
      return [
        // API routes to FastAPI backend
        {
          source: '/annotations/:path*',
          destination: `${apiTarget}/annotations/:path*`
        },
        {
          source: '/assemblies/:path*',
          destination: `${apiTarget}/assemblies/:path*`
        },
        {
          source: '/organisms/:path*',
          destination: `${apiTarget}/organisms/:path*`
        },
        {
          source: '/taxons/:path*',
          destination: `${apiTarget}/taxons/:path*`
        },
        // File serving through nginx
        {
          source: '/files/:path*',
          destination: `${nginxTarget}/files/:path*`
        }
      ]
    }
    return []
  },
}

export default nextConfig;
