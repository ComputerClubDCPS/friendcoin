const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY

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
  if (!ALPHA_VANTAGE_API_KEY) {
    console.warn('Alpha Vantage API key not configured, using mock data')
    return getMockStocks(query)
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${ALPHA_VANTAGE_API_KEY}`
    )
    
    const data = await response.json()
    
    if (data['Error Message'] || data['Note']) {
      console.warn('Alpha Vantage API limit reached, using mock data')
      return getMockStocks(query)
    }
    
    const matches = data.bestMatches || []
    
    return matches.slice(0, 10).map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      price: 0, // Will be fetched separately
      change: 0,
      changePercent: 0,
    }))
  } catch (error) {
    console.error('Error searching stocks:', error)
    return getMockStocks(query)
  }
}

export async function getStockPrice(symbol: string): Promise<StockData | null> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.warn('Alpha Vantage API key not configured, using mock data')
    return getMockStock(symbol)
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    )
    
    const data = await response.json()
    
    if (data['Error Message'] || data['Note']) {
      console.warn('Alpha Vantage API limit reached, using mock data')
      return getMockStock(symbol)
    }
    
    const quote = data['Global Quote']
    
    if (!quote) {
      return getMockStock(symbol)
    }
    
    return {
      symbol: quote['01. symbol'],
      name: quote['01. symbol'], // Alpha Vantage doesn't provide company name in this endpoint
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
    }
  } catch (error) {
    console.error('Error fetching stock price:', error)
    return getMockStock(symbol)
  }
}

// Mock data fallback
const MOCK_STOCKS: Record<string, StockData> = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 170.22,
    change: 2.15,
    changePercent: 1.28,
    volume: 45234567,
    marketCap: "2.65T"
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 138.15,
    change: -1.23,
    changePercent: -0.88,
    volume: 23456789,
    marketCap: "1.75T"
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 378.85,
    change: 4.56,
    changePercent: 1.22,
    volume: 34567890,
    marketCap: "2.81T"
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    price: 248.50,
    change: -8.75,
    changePercent: -3.40,
    volume: 67890123,
    marketCap: "789B"
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 145.80,
    change: 1.89,
    changePercent: 1.31,
    volume: 45678901,
    marketCap: "1.52T"
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 875.50,
    change: 12.34,
    changePercent: 1.43,
    volume: 56789012,
    marketCap: "2.16T"
  }
}

function getMockStocks(query: string): StockData[] {
  return Object.values(MOCK_STOCKS)
    .filter(stock => 
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase())
    )
    .map(stock => ({
      ...stock,
      price: stock.price + (Math.random() - 0.5) * 10,
      change: (Math.random() - 0.5) * 5,
      changePercent: (Math.random() - 0.5) * 3,
    }))
}

function getMockStock(symbol: string): StockData | null {
  const stock = MOCK_STOCKS[symbol.toUpperCase()]
  if (!stock) return null
  
  return {
    ...stock,
    price: stock.price + (Math.random() - 0.5) * 10,
    change: (Math.random() - 0.5) * 5,
    changePercent: (Math.random() - 0.5) * 3,
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
