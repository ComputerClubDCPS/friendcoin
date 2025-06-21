export interface CurrencyAmount {
  friendcoins: number
  friendshipFractions: number
}

export function formatCurrency(amount: CurrencyAmount): string {
  return `${amount.friendcoins}.${amount.friendshipFractions.toString().padStart(2, "0")}f€`
}

export function parseCurrency(formatted: string): CurrencyAmount {
  const match = formatted.match(/^(\d+)\.(\d{2})f€$/)
  if (!match) {
    throw new Error("Invalid currency format")
  }
  return {
    friendcoins: Number.parseInt(match[1]),
    friendshipFractions: Number.parseInt(match[2]),
  }
}

export function addCurrency(a: CurrencyAmount, b: CurrencyAmount): CurrencyAmount {
  let totalFractions = a.friendshipFractions + b.friendshipFractions
  let totalCoins = a.friendcoins + b.friendcoins

  if (totalFractions >= 100) {
    totalCoins += Math.floor(totalFractions / 100)
    totalFractions = totalFractions % 100
  }

  return { friendcoins: totalCoins, friendshipFractions: totalFractions }
}

export function subtractCurrency(a: CurrencyAmount, b: CurrencyAmount): CurrencyAmount {
  const totalFractionsA = a.friendcoins * 100 + a.friendshipFractions
  const totalFractionsB = b.friendcoins * 100 + b.friendshipFractions

  if (totalFractionsA < totalFractionsB) {
    throw new Error("Insufficient funds")
  }

  const resultFractions = totalFractionsA - totalFractionsB

  return {
    friendcoins: Math.floor(resultFractions / 100),
    friendshipFractions: resultFractions % 100,
  }
}

export function calculateTax(amount: CurrencyAmount): CurrencyAmount {
  const totalFractions = amount.friendcoins * 100 + amount.friendshipFractions
  const taxFractions = Math.floor(totalFractions * 0.05)

  return {
    friendcoins: Math.floor(taxFractions / 100),
    friendshipFractions: taxFractions % 100,
  }
}
