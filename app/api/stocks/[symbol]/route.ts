import { type NextRequest, NextResponse } from "next/server"

const STOCK_DATA: Record<string, any> = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 170.22,
    change: 2.15,
    changePercent: 1.28,
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 138.15,
    change: -1.85,
    changePercent: -1.32,
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 378.85,
    change: 4.22,
    changePercent: 1.13,
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    price: 248.5,
    change: -8.75,
    changePercent: -3.4,
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 145.8,
    change: 2.9,
    changePercent: 2.03,
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 875.5,
    change: 15.25,
    changePercent: 1.77,
  },
}

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = params

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    const stock = STOCK_DATA[symbol.toUpperCase()]
    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 })
    }

    // Add some price variation
    const updatedStock = {
      ...stock,
      price: stock.price + (Math.random() - 0.5) * 3,
      change: (Math.random() - 0.5) * 4,
      changePercent: (Math.random() - 0.5) * 2,
    }

    return NextResponse.json({ stock: updatedStock })
  } catch (error) {
    console.error("Stock fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 })
  }
}
