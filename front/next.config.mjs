/** @type {import('next').NextConfig} */

const nextConfig = {
  // Enable static export for GitHub Pages
  output: 'export',
  basePath: '/annotrieve',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  /**
   * During development we still want the Next.js dev server to proxy API and file
   * requests to the running backend / nginx containers. In production this config
   * is ignored because the app is exported statically and nginx handles the routing.
   */
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return []
    }

    const stripTrailingSlash = (value = '') =>
      value.endsWith('/') ? value.slice(0, -1) : value

    const devApiOrigin = stripTrailingSlash(
      process.env.NEXT_DEV_API_ORIGIN ?? 'http://localhost:94/annotrieve'
    )
    const devFilesOrigin = stripTrailingSlash(
      process.env.NEXT_DEV_FILES_ORIGIN ?? 'http://localhost:94/annotrieve'
    )

    return [
      {
        source: '/api/v0/:path*',
        destination: `${devApiOrigin}/api/v0/:path*`,
      },
      {
        source: '/files/:path*',
        destination: `${devFilesOrigin}/files/:path*`,
      },
    ]
  },
}

export default nextConfig;
