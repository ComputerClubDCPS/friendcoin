import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServiceClient } from "@/lib/supabase-server"
import * as Sentry from "@sentry/nextjs"

export async function GET(request: NextRequest) {
  const checkInId = Sentry.captureCheckIn(
  {
    monitorSlug: 'financial-operations-cron',
    status: 'in_progress',
  },
  {
    schedule: { // Specify your schedule options here
      type: 'crontab',
      value: '0 0 * * *',
    },
    checkinMargin: 1,
    maxRuntime: 1,
    timezone: 'Europe/London',
  });
  
  const checkInId = Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "financial-operations-cron",
    status: "in_progress",
  })

  return Sentry.startSpan(
    {
      op: "cron.job",
      name: "Financial Operations Cron",
    },
    async (span) => {
      try {
        // Verify this is a legitimate cron request
        const authHeader = request.headers.get("authorization")
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          span.setStatus({ code: 2, message: "Unauthorized" })
          Sentry.captureCheckIn({
            checkInId,
            monitorSlug: "financial-operations-cron",
            status: "error",
          })
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await createSupabaseServiceClient()

        await Sentry.startSpan(
          {
            op: "db.query",
            name: "Process Debt Management",
          },
          async (debtSpan) => {
            try {
              const { data, error } = await supabase.rpc("schedule_debt_management")

              if (error) {
                debtSpan.setStatus({ code: 2, message: error.message })
                Sentry.captureException(error)
                throw error
              }

              debtSpan.setAttribute("processed_accounts", data?.processed_accounts || 0)
              console.log("[v0] Debt management completed:", data)
            } catch (error) {
              debtSpan.setStatus({ code: 2, message: "Debt management failed" })
              throw error
            }
          },
        )

        await Sentry.startSpan(
          {
            op: "db.query",
            name: "Process Interest Payments",
          },
          async (interestSpan) => {
            try {
              const { data, error } = await supabase.rpc("distribute_weekly_interest")

              if (error) {
                interestSpan.setStatus({ code: 2, message: error.message })
                Sentry.captureException(error)
                throw error
              }

              interestSpan.setAttribute("interest_distributed", data?.total_interest || 0)
              interestSpan.setAttribute("accounts_processed", data?.accounts_processed || 0)
              console.log("[v0] Interest payments completed:", data)
            } catch (error) {
              interestSpan.setStatus({ code: 2, message: "Interest payments failed" })
              throw error
            }
          },
        )

        span.setStatus({ code: 1, message: "Success" })
        Sentry.captureCheckIn({
          checkInId,
          monitorSlug: "financial-operations-cron",
          status: "ok",
        })

        return NextResponse.json({
          success: true,
          message: "Financial operations completed successfully",
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        span.setStatus({ code: 2, message: "Financial operations failed" })
        Sentry.captureException(error)
        Sentry.captureCheckIn({
          checkInId,
          monitorSlug: "financial-operations-cron",
          status: "error",
        })

        console.error("[v0] Financial operations cron failed:", error)
        return NextResponse.json(
          { error: "Financial operations failed", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 },
        )
      }
    },
  )
}
