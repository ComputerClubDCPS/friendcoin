import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import * as Sentry from "@sentry/nextjs"
import { stackServerApp } from "@/stack"

// Wrapper to add automatic breadcrumbs for Supabase operations
function wrapSupabaseClientWithBreadcrumbs(client: any) {
  const originalFrom = client.from.bind(client)
  const originalRpc = client.rpc.bind(client)
  
  client.from = (table: string) => {
    const tableClient = originalFrom(table)
    
    // Wrap common operations
    const operations = ['select', 'insert', 'update', 'delete', 'upsert']
    operations.forEach(op => {
      if (tableClient[op]) {
        const originalOp = tableClient[op].bind(tableClient)
        tableClient[op] = (...args: any[]) => {
          // Add breadcrumb when operation is called
          Sentry.addBreadcrumb({
            category: "database",
            message: `Supabase ${op} on ${table}`,
            level: "info",
            data: {
              operation: op,
              table,
              timestamp: new Date().toISOString()
            }
          })
          
          return originalOp(...args)
        }
      }
    })
    
    return tableClient
  }
  
  client.rpc = (fnName: string, ...args: any[]) => {
    Sentry.addBreadcrumb({
      category: "database",
      message: `Supabase RPC call: ${fnName}`,
      level: "info",
      data: {
        operation: "rpc",
        function: fnName,
        timestamp: new Date().toISOString()
      }
    })
    
    return originalRpc(fnName, ...args)
  }
  
  return client
}

export async function createSupabaseServerClient() {
  return Sentry.startSpan(
    {
      op: "db.connection",
      name: "Create Supabase Server Client",
    },
    () => {
      const cookieStore = cookies()

      const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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

      return wrapSupabaseClientWithBreadcrumbs(client)
    },
  )
}

// DEPRECATED: This function created malformed JWTs that Supabase couldn't validate.
// Use createSupabaseServiceClient() with Stack Auth authentication instead.
// 
// export async function createAuthenticatedSupabaseClient() {
//   return Sentry.startSpan(
//     {
//       op: "db.connection",
//       name: "Create Authenticated Supabase Client",
//     },
//     async () => {
//       const user = await stackServerApp.getUser()
//       if (!user) {
//         throw new Error("User not authenticated")
//       }

//       const cookieStore = cookies()

//       const client = createServerClient(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//         {
//           cookies: {
//             getAll() {
//               return cookieStore.getAll()
//             },
//             setAll(cookiesToSet) {
//               try {
//                 cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
//               } catch {
//                 // The `setAll` method was called from a Server Component.
//                 // This can be ignored if you have middleware refreshing
//                 // user sessions.
//               }
//             },
//           },
//         }
//       )

//       // Create a custom JWT token for Supabase RLS that includes the Stack Auth user ID
//       const customJWT = Buffer.from(JSON.stringify({
//         sub: user.id,
//         role: "authenticated",
//         iat: Math.floor(Date.now() / 1000),
//         exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
//       })).toString('base64')

//       // Set the session manually for RLS policies
//       await client.auth.setSession({
//         access_token: `fake.${customJWT}.fake`,
//         refresh_token: 'fake_refresh_token',
//       })

//       return { client, user }
//     }
//   )
// }

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

      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      return wrapSupabaseClientWithBreadcrumbs(client)
    },
  )
}
