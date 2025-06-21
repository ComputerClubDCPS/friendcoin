import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stack_user_id, display_name, email } = body

    console.log("Initializing user:", { stack_user_id, display_name, email })

    if (!stack_user_id) {
      return NextResponse.json({ error: "Stack user ID required" }, { status: 400 })
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("stack_user_id", stack_user_id)
      .single()

    console.log("Existing user query result:", { existingUser, fetchError })

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching user:", fetchError)
      return NextResponse.json({ error: "Database error while fetching user" }, { status: 500 })
    }

    if (existingUser) {
      console.log("Returning existing user")
      return NextResponse.json({ user: existingUser })
    }

    // Create new user
    console.log("Creating new user")
    const cardNumber = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("")

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        stack_user_id,
        balance_friendcoins: 10,
        balance_friendship_fractions: 0,
        card_number: cardNumber,
        last_interest_payment: new Date().toISOString(),
      })
      .select()
      .single()

    console.log("New user creation result:", { newUser, insertError })

    if (insertError) {
      console.error("Error creating user:", insertError)
      return NextResponse.json({ error: "Failed to create user account" }, { status: 500 })
    }

    console.log("Successfully created new user")
    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error("User initialization error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
