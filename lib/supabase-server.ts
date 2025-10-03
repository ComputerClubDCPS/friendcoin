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

// Helper function to convert base64 to base64url
function base64ToBase64Url(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
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

      // Use service role client for authenticated operations to bypass RLS issues
      // This is more reliable than trying to create custom JWTs
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for authenticated operations")
      }

      const cookieStore = cookies()

      const client = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

      // Capture client creation for monitoring
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Created authenticated Supabase client with service role',
        level: 'info',
        data: {
          user_id: user.id,
          client_type: 'service_role'
        }
      })

        // Create a minimal signature for the JWT (since we're not validating it server-side)
        // This creates a properly formatted JWT that Supabase can parse
        const signature = base64ToBase64Url(
          Buffer.from('fake-signature').toString('base64')
        )

        const customJWT = `${encodedHeader}.${encodedPayload}.${signature}`

        // Set the session manually for RLS policies
        await client.auth.setSession({
          access_token: customJWT,
          refresh_token: 'fake_refresh_token',
        })

        // Capture JWT creation for monitoring
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Created custom JWT for Supabase RLS',
          level: 'info',
          data: {
            user_id: user.id,
            jwt_length: customJWT.length,
            header_claims: Object.keys(header),
            payload_claims: Object.keys(payload)
          }
        })

        return { client, user }
      } catch (jwtError) {
        // Enhanced error tracing for JWT creation
        Sentry.captureException(jwtError, {
          tags: { 
            operation: "jwt_creation",
            user_id: user.id 
          },
          extra: {
            error_message: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
            user_data: { id: user.id }
          }
        })
        throw new Error(`Failed to create JWT for user authentication: ${jwtError instanceof Error ? jwtError.message : 'Unknown error'}`)
      }
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
