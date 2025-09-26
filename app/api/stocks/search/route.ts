import { type NextRequest, NextResponse } from "next/server"
import { getCachedStockData } from "@/lib/stock-cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    const cachedData = await getCachedStockData()

    if (!cachedData || cachedData.length === 0) {
      return NextResponse.json({ stocks: [] })
    }

    // Filter stocks based on search query
    const results = cachedData.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase()),
    )

    return NextResponse.json({ stocks: results })
  } catch (error) {
    console.error("Stock search error:", error)
    return NextResponse.json({ error: "Failed to search stocks" }, { status: 500 })
  }
}
