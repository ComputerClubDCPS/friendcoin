import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getStockPrice } from "@/lib/stock-api"

// Popular stocks to update daily
const POPULAR_STOCKS = [
  "AAPL",
  "GOOGL",
  "MSFT",
  "TSLA",
  "AMZN",
  "NVDA",
  "META",
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

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Starting daily stock updates...")

    const results = []

    for (const symbol of POPULAR_STOCKS) {
      try {
        const stockData = await getStockPrice(symbol)

        if (stockData) {
          const { error } = await supabaseAdmin.from("stock_cache").upsert({
            symbol: stockData.symbol,
            name: stockData.name,
            price: stockData.price,
            change_amount: stockData.change,
            change_percent: stockData.changePercent,
            volume: stockData.volume,
            last_updated: new Date().toISOString(),
          })

          if (error) {
            console.error(`Error updating ${symbol}:`, error)
            results.push({ symbol, success: false, error: error.message })
          } else {
            console.log(`[v0] Updated ${symbol}: $${stockData.price}`)
            results.push({ symbol, success: true, price: stockData.price })
          }
        }

        // Rate limiting - wait 12 seconds between calls (Alpha Vantage allows 5 calls/minute)
        await new Promise((resolve) => setTimeout(resolve, 12000))
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error)
        results.push({ symbol, success: false, error: error.message })
      }
    }

    console.log("[v0] Stock updates completed:", results)

    return NextResponse.json({
      success: true,
      message: "Stock updates completed",
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Stock update cron failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
