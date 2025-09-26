import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { nanoid } from "nanoid"
import * as Sentry from "@sentry/nextjs"

export const runtime = "edge"

export async function POST(req: NextRequest): Promise<NextResponse> {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/payments/create-session",
    },
    async () => {
      if (req.method !== "POST") {
        return new NextResponse(JSON.stringify({ message: "Method Not Allowed" }), {
          status: 405,
          headers: {
            "Content-Type": "application/json",
          },
        })
      }

      try {
        const { amount, returnUrl } = (await req.json()) as { amount: number; returnUrl?: string }

        if (typeof amount !== "number" || amount <= 0) {
          return new NextResponse(JSON.stringify({ message: "Invalid amount" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          })
        }

        const sessionToken = nanoid()
        const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now

        await kv.set(sessionToken, {
          amount,
          created_at: new Date().toISOString(),
          expires_at,
          paid: false,
        })

        await kv.expire(sessionToken, 60 * 60) // Expire the key after 1 hour

        const paymentUrl = `https://friendcoin1.vercel.app/pay/${sessionToken}${returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : ""}`

        return new NextResponse(JSON.stringify({ paymentUrl }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        })
      } catch (e: any) {
        console.error(e)
        Sentry.captureException(e)
        return new NextResponse(JSON.stringify({ message: "Internal Server Error", error: e.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        })
      }
    },
  )
}
