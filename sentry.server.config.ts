import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://e302d685ccf8745043402277013de644@o4509781109112832.ingest.de.sentry.io/4510085911806032",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,
})
