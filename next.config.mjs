import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.sentry.io https://*.stack-auth.com https://*.vercel.app https://sentry.io" ,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.sentry.io https://vercel.live wss://vercel.live https://*.supabase.co https://*.stack-auth.com",
              "frame-src 'self' https://vercel.live",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default withSentryConfig(nextConfig, {
  org: "archiemtop",
  project: "friendcoin",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: true,

  // Enable source map uploads for better debugging
  uploadSourceMaps: true,
  
  // Use auth token from environment variable
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Capture React component names for better debugging
  reactComponentAnnotation: {
    enabled: true,
  },

  // Enhanced source map configuration
  hideSourceMaps: true,
  widenClientFileUpload: true,
  
  // Additional debugging options
      sourcemaps: {
      disable: false, // Source maps are enabled by default
      assets: ["**/*.js", "**/*.js.map","**/*.ts", "**/*.ts.map" ], // Specify which files to upload
      ignore: ["**/node_modules/**"], // Files to exclude
      deleteSourcemapsAfterUpload: true, // Security: delete after upload
    },

  
  // Better release tracking
  release: {
    create: true,
    finalize: true,
    deploy: {
      env: process.env.VERCEL_ENV || "development",
    },
  },
  
  // Enhanced error tracking
  errorHandler: (error, errorInfo, compilation) => {
    console.error("Sentry webpack plugin error:", error);
  },
});
