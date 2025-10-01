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
}

export default withSentryConfig(nextConfig, {
  org: "archiemtop",
  project: "friendcoin-platform",

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
    disable: false,
    uploadLegacySourcemaps: true,
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
