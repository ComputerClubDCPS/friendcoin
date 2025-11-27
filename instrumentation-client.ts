import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://e302d685ccf8745043402277013de644@o4509781109112832.ingest.de.sentry.io/4510085911806032",

  // Adds request headers and IP for users
  sendDefaultPii: true,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing
  tracesSampleRate: 1.0,

  integrations: [
    // Replay may only be enabled for the client-side
    Sentry.replayIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: "system",
    }),
  ],

  // Capture Replay for 10% of all sessions, plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  sourcemaps: {
    disable: false, // Source maps are enabled by default
    assets: ["**/*.js", "**/*.js.map"], // Specify which files to upload
    ignore: ["**/node_modules/**"], // Files to exclude
    deleteSourcemapsAfterUpload: true, // Security: delete after upload
  },
})

// This export will instrument router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
