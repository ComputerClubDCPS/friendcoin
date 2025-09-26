import * as Sentry from "@sentry/nextjs"

interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

// In-memory cache for stock data
let stockCache: StockData[] = []
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Popular stocks to fetch data for
const STOCK_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA", "META", "NFLX"]

export async function getCachedStockData(): Promise<StockData[]> {
  return Sentry.startSpan(
    {
      op: "cache.read",
      name: "Get Cached Stock Data",
    },
    async (span) => {
      const now = Date.now()

      // Check if cache is still valid
      if (stockCache.length > 0 && now - lastFetchTime < CACHE_DURATION) {
        span.setAttribute("cache_hit", true)
        span.setAttribute("cached_stocks_count", stockCache.length)
        return stockCache
      }

      span.setAttribute("cache_hit", false)

      try {
        // Fetch fresh data
        const freshData = await fetchStockData()
        stockCache = freshData
        lastFetchTime = now

        span.setAttribute("fetched_stocks_count", freshData.length)
        return freshData
      } catch (error) {
        Sentry.captureException(error)

        // Return cached data if available, even if stale
        if (stockCache.length > 0) {
          span.setAttribute("fallback_to_stale_cache", true)
          return stockCache
        }

        // Return empty array if no cache available
        return []
      }
    },
  )
}

async function fetchStockData(): Promise<StockData[]> {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: "Fetch Stock Data from Alpha Vantage",
    },
    async (span) => {
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY

      if (!apiKey) {
        throw new Error("Alpha Vantage API key not configured")
      }

      const stockData: StockData[] = []

      // Fetch data for each stock symbol
      for (const symbol of STOCK_SYMBOLS) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
          )

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          const quote = data["Global Quote"]

          if (quote && quote["01. symbol"]) {
            const price = Number.parseFloat(quote["05. price"])
            const change = Number.parseFloat(quote["09. change"])
            const changePercent = Number.parseFloat(quote["10. change percent"].replace("%", ""))

            stockData.push({
              symbol: quote["01. symbol"],
              name: getCompanyName(symbol),
              price,
              change,
              changePercent,
            })
          }

          // Add delay to respect API rate limits
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error)
          Sentry.captureException(error)
        }
      }

      span.setAttribute("successful_fetches", stockData.length)
      return stockData
    },
  )
}

function getCompanyName(symbol: string): string {
  const companyNames: Record<string, string> = {
    AAPL: "Apple Inc.",
    GOOGL: "Alphabet Inc.",
    MSFT: "Microsoft Corporation",
    TSLA: "Tesla, Inc.",
    AMZN: "Amazon.com Inc.",
    NVDA: "NVIDIA Corporation",
    META: "Meta Platforms Inc.",
    NFLX: "Netflix Inc.",
  }

  return companyNames[symbol] || symbol
}

export async function updateStockCache(symbol: string): Promise<StockData | null> {
  return Sentry.startSpan(
    {
      op: "cache.update",
      name: `Update Stock Cache: ${symbol}`,
    },
    async (span) => {
      span.setAttribute("stock.symbol", symbol)

      try {
        const apiKey = process.env.ALPHA_VANTAGE_API_KEY

        if (!apiKey) {
          throw new Error("Alpha Vantage API key not configured")
        }

        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        const quote = data["Global Quote"]

        if (quote && quote["01. symbol"]) {
          const price = Number.parseFloat(quote["05. price"])
          const change = Number.parseFloat(quote["09. change"])
          const changePercent = Number.parseFloat(quote["10. change percent"].replace("%", ""))

          const stockData: StockData = {
            symbol: quote["01. symbol"],
            name: getCompanyName(symbol),
            price,
            change,
            changePercent,
          }

          // Update the in-memory cache
          const existingIndex = stockCache.findIndex((stock) => stock.symbol === symbol)
          if (existingIndex >= 0) {
            stockCache[existingIndex] = stockData
          } else {
            stockCache.push(stockData)
          }

          span.setAttribute("stock.price", price)
          span.setAttribute("stock.change", change)
          span.setStatus({ code: 1, message: "Success" })

          return stockData
        } else {
          span.setStatus({ code: 2, message: "No quote data received" })
          return null
        }
      } catch (error) {
        span.setStatus({ code: 2, message: "Failed to update stock data" })
        Sentry.captureException(error, {
          tags: { stock_symbol: symbol },
          extra: { operation: "update_stock_cache" },
        })
        console.error(`[v0] Error updating stock data for ${symbol}:`, error)
        return null
      }
    },
  )
}

// Initialize cache on module load
if (typeof window === "undefined") {
  // Only run on server side
  getCachedStockData().catch(console.error)
}
