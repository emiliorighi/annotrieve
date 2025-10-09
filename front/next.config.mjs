/** @type {import('next').NextConfig} */


const FASTAPI_HOST = process.env.NEXT_PUBLIC_FASTAPI_HOST || 'localhost'
const FASTAPI_PORT = process.env.NEXT_PUBLIC_FASTAPI_PORT || '5002'

const nextConfig = {
  async rewrites() {
    const apiTarget = `http://${FASTAPI_HOST}:${FASTAPI_PORT}`
    const nginxTarget = `http://localhost:94/annotrieve`
    
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
  },
}

export default nextConfig;
