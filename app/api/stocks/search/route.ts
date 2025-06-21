import { type NextRequest, NextResponse } from "next/server"

const MOCK_STOCKS = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 170.22,
    change: 2.15,
    changePercent: 1.28,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 138.15,
    change: -1.85,
    changePercent: -1.32,
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 378.85,
    change: 4.22,
    changePercent: 1.13,
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    price: 248.5,
    change: -8.75,
    changePercent: -3.4,
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 145.8,
    change: 2.9,
    changePercent: 2.03,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 875.5,
    change: 15.25,
    changePercent: 1.77,
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    price: 485.2,
    change: -3.45,
    changePercent: -0.71,
  },
  {
    symbol: "NFLX",
    name: "Netflix Inc.",
    price: 425.8,
    change: 8.9,
    changePercent: 2.14,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Add some price variation to make it realistic
    const results = MOCK_STOCKS.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase()),
    ).map((stock) => ({
      ...stock,
      price: stock.price + (Math.random() - 0.5) * 5,
      change: (Math.random() - 0.5) * 6,
      changePercent: (Math.random() - 0.5) * 3,
    }))

    return NextResponse.json({ stocks: results })
  } catch (error) {
    console.error("Stock search error:", error)
    return NextResponse.json({ error: "Failed to search stocks" }, { status: 500 })
  }
}
