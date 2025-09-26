import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServiceClient } from "@/lib/supabase-server"
import { updateStockCache } from "@/lib/stock-cache"
import * as Sentry from "@sentry/nextjs"

export async function GET(request: NextRequest) {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug: "market-data-cron",
    status: "in_progress",
  })

  return Sentry.startSpan(
    {
      op: "cron.job",
      name: "Market Data Update Cron",
    },
    async (span) => {
      try {
        // Verify this is a legitimate cron request
        const authHeader = request.headers.get("authorization")
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          span.setStatus({ code: 2, message: "Unauthorized" })
          Sentry.captureCheckIn({
            checkInId,
            monitorSlug: "market-data-cron",
            status: "error",
          })
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await createSupabaseServiceClient()

        const stockSymbols = [
          "AAPL",
          "GOOGL",
          "MSFT",
          "AMZN",
          "TSLA",
          "META",
          "NVDA",
          "NFLX",
          "AMD",
          "INTC",
          "CRM",
          "ORCL",
          "ADBE",
          "PYPL",
          "UBER",
          "SPOT",
        ]

        let updatedCount = 0
        let errorCount = 0

        for (const symbol of stockSymbols) {
          try {
            await Sentry.startSpan(
              {
                op: "http.client",
                name: `Update Stock Data: ${symbol}`,
              },
              async (stockSpan) => {
                stockSpan.setAttribute("stock.symbol", symbol)

                const stockData = await updateStockCache(symbol)
                if (stockData) {
                  updatedCount++
                  stockSpan.setAttribute("stock.price", stockData.price)
                  stockSpan.setAttribute("stock.change", stockData.change)
                } else {
                  errorCount++
                  stockSpan.setStatus({ code: 2, message: "Failed to update stock data" })
                }
              },
            )

            // Rate limiting - wait 200ms between requests
            await new Promise((resolve) => setTimeout(resolve, 200))
          } catch (error) {
            errorCount++
            Sentry.captureException(error, {
              tags: { stock_symbol: symbol },
              extra: { operation: "stock_update" },
            })
            console.error(`[v0] Failed to update ${symbol}:`, error)
          }
        }

        span.setAttribute("stocks.updated", updatedCount)
        span.setAttribute("stocks.errors", errorCount)
        span.setStatus({ code: 1, message: "Success" })

        Sentry.captureCheckIn({
          checkInId,
          monitorSlug: "market-data-cron",
          status: "ok",
        })

        console.log(`[v0] Market data update completed: ${updatedCount} updated, ${errorCount} errors`)

        return NextResponse.json({
          success: true,
          updated: updatedCount,
          errors: errorCount,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        span.setStatus({ code: 2, message: "Market data update failed" })
        Sentry.captureException(error)
        Sentry.captureCheckIn({
          checkInId,
          monitorSlug: "market-data-cron",
          status: "error",
        })

        console.error("[v0] Market data cron failed:", error)
        return NextResponse.json(
          { error: "Market data update failed", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 },
        )
      }
    },
  )
}
