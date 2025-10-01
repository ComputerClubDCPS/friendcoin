export interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume?: number
  marketCap?: string
}

export async function searchStocks(query: string): Promise<StockData[]> {
  if (!proccess.env.ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage API key not configured")
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
    )

    const data = await response.json()

    if (data["Error Message"]) {
      throw new Error(data["Error Message"])
    }

    if (data["Note"]) {
      throw new Error("API rate limit exceeded")
    }

    const matches = data.bestMatches || []

    // Get current prices for each stock
    const stocksWithPrices = await Promise.all(
      matches.slice(0, 10).map(async (match: any) => {
        const priceData = await getStockPrice(match["1. symbol"])
        return (
          priceData || {
            symbol: match["1. symbol"],
            name: match["2. name"],
            price: 0,
            change: 0,
            changePercent: 0,
          }
        )
      }),
    )

    return stocksWithPrices
  } catch (error) {
    console.error("Error searching stocks:", error)
    throw error
  }
}

export async function getStockPrice(symbol: string): Promise<StockData | null> {
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage API key not configured")
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
    )

    const data = await response.json()

    if (data["Error Message"]) {
      throw new Error(data["Error Message"])
    }

    if (data["Note"]) {
      throw new Error("API rate limit exceeded")
    }

    const quote = data["Global Quote"]

    if (!quote) {
      return null
    }

    return {
      symbol: quote["01. symbol"],
      name: quote["01. symbol"], // Alpha Vantage doesn't provide company name in this endpoint
      price: Number.parseFloat(quote["05. price"]),
      change: Number.parseFloat(quote["09. change"]),
      changePercent: Number.parseFloat(quote["10. change percent"].replace("%", "")),
      volume: Number.parseInt(quote["06. volume"]),
    }
  } catch (error) {
    console.error("Error fetching stock price:", error)
    throw error
  }
}

export async function getDailyStockData(symbol: string): Promise<any> {
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage API key not configured")
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
    )

    const data = await response.json()

    if (data["Error Message"]) {
      throw new Error(data["Error Message"])
    }

    if (data["Note"]) {
      throw new Error("API rate limit exceeded")
    }

    return data["Time Series (Daily)"]
  } catch (error) {
    console.error("Error fetching daily stock data:", error)
    throw error
  }
}

export function usdToFriendCoins(usd: number): { friendcoins: number; friendshipFractions: number } {
  const total = usd * 1.2 // 1 USD = 1.2 FriendCoins
  const friendcoins = Math.floor(total)
  const friendshipFractions = Math.round((total % 1) * 100)
  return { friendcoins, friendshipFractions }
}

export function friendCoinsToUsd(friendcoins: number, friendshipFractions: number): number {
  const total = friendcoins + friendshipFractions / 100
  return total / 1.2 // 1.2 FriendCoins = 1 USD
}
