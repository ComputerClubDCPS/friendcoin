import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import * as Sentry from "@sentry/nextjs"
import { stackServerApp } from "@/stack"

export async function createSupabaseServerClient() {
  return Sentry.startSpan(
    {
      op: "db.connection",
      name: "Create Supabase Server Client",
    },
    () => {
      const cookieStore = cookies()

      return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      })
    },
  )
}

export async function createAuthenticatedSupabaseClient() {
  return Sentry.startSpan(
    {
      op: "db.connection",
      name: "Create Authenticated Supabase Client",
    },
    async () => {
      const user = await stackServerApp.getUser()
      if (!user) {
        throw new Error("User not authenticated")
      }

      const cookieStore = cookies()

      const client = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
          },
        }
      )

      // Create a custom JWT token for Supabase RLS that includes the Stack Auth user ID
      const customJWT = Buffer.from(JSON.stringify({
        sub: user.id,
        role: "authenticated",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      })).toString('base64')

      // Set the session manually for RLS policies
      await client.auth.setSession({
        access_token: `fake.${customJWT}.fake`,
        refresh_token: 'fake_refresh_token',
      })

      return { client, user }
    }
  )
}

export async function createSupabaseServiceClient() {
  return Sentry.startSpan(
    {
      op: "db.connection",
      name: "Create Supabase Service Client",
    },
    () => {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service operations")
      }

      return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No-op for service client
          },
        },
      })
    },
  )
}
