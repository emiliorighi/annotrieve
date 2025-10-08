/** @type {import('next').NextConfig} */


const FASTAPI_HOST = process.env.NEXT_PUBLIC_FASTAPI_HOST || 'localhost'
const FASTAPI_PORT = process.env.NEXT_PUBLIC_FASTAPI_PORT || '5002'

const nextConfig = {
  async rewrites() {
    const target = `http://${FASTAPI_HOST}:${FASTAPI_PORT}`
    const paths = ['/annotations/:path*', '/assemblies/:path*', '/organisms/:path*', '/taxons/:path*']
    return paths.map(source => ({ source, destination: `${target}${source.replace(':path*', '')}:path*` }))
  },
}

export default nextConfig;
