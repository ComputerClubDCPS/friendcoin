import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServiceClient } from "@/lib/supabase-server"
import { stackServerApp } from "@/stack"
import * as Sentry from "@sentry/nextjs"

export async function GET(request: NextRequest) {
  return Sentry.withServerActionInstrumentation(
    "developer-projects-get",
    async () => {
      try {
        // Get authenticated user from Stack Auth
        const user = await stackServerApp.getUser()
        
        if (!user) {
          Sentry.captureMessage("Unauthorized projects fetch attempt", "warning")
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Use service client to bypass RLS - Stack Auth already handles authentication
        const supabase = await createSupabaseServiceClient()

        const { data: projects, error } = await supabase
          .from("merchant_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching projects:", error)
          Sentry.captureException(error, {
            tags: { 
              operation: "fetch_projects",
              user_id: user.id 
            },
            extra: {
              supabase_error: error,
              error_code: error.code,
              error_message: error.message
            }
          })

          // Check if it's a permission/auth error
          if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
            return NextResponse.json({ 
              error: "Access denied. Please check your authentication or contact support.",
              details: "Database permission error"
            }, { status: 403 })
          }

          // Check if it's a missing table error
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            return NextResponse.json({ 
              error: "Service temporarily unavailable. Please try again later.",
              details: "Database schema error"
            }, { status: 503 })
          }

          return NextResponse.json({ 
            error: "Failed to fetch projects",
            details: "Database query failed"
          }, { status: 500 })
        }

        return NextResponse.json({ projects })
      } catch (error) {
        console.error("Projects fetch error:", error)
        Sentry.captureException(error, {
          tags: { operation: "fetch_projects" },
          extra: { request_url: request.url }
        })

        // Check if it's a Supabase configuration error
        if (error instanceof Error && error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          return NextResponse.json({ 
            error: "Service configuration error. Please contact support.",
            details: "Missing database credentials"
          }, { status: 503 })
        }

        return NextResponse.json({ 
          error: "Internal server error",
          details: "Unexpected error occurred"
        }, { status: 500 })
      }
    }
  )
}

export async function POST(request: NextRequest) {
  return Sentry.withServerActionInstrumentation(
    "developer-projects-post",
    async () => {
      try {
        // Get authenticated user from Stack Auth
        const user = await stackServerApp.getUser()
        
        if (!user) {
          Sentry.captureMessage("Unauthorized project creation attempt", "warning")
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Use service client to bypass RLS - Stack Auth already handles authentication
        const supabase = await createSupabaseServiceClient()

        const body = await request.json()
        const { name, description, webhook_url, database_url, account_number } = body

        if (!name || !account_number) {
          Sentry.captureMessage("Missing required fields in project creation", "warning")
          return NextResponse.json({ error: "Project name and account number are required" }, { status: 400 })
        }

        // Generate API key
        const apiKey = `fc_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

        const { data: newProject, error } = await supabase
          .from("merchant_projects")
          .insert({
            user_id: user.id,
            name: name.trim(),
            description: description?.trim() || "",
            api_key: apiKey,
            webhook_url: webhook_url?.trim() || null,
            database_url: database_url?.trim() || "",
            account_number: account_number.trim(),
            is_active: true,
          })
          .select()
          .single()

        if (error) {
          console.error("Error creating project:", error)
          Sentry.captureException(error, {
            tags: { 
              operation: "create_project",
              user_id: user.id 
            },
            extra: {
              supabase_error: error,
              project_data: { name, description, account_number }
            }
          })

          // Check if it's a permission/auth error
          if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
            return NextResponse.json({ 
              error: "Access denied. Please check your authentication or contact support.",
              details: "Database permission error"
            }, { status: 403 })
          }

          // Check for duplicate key errors
          if (error.code === '23505' || error.message?.includes('duplicate key')) {
            return NextResponse.json({ 
              error: "A project with this information already exists.",
              details: "Duplicate data conflict"
            }, { status: 409 })
          }

          return NextResponse.json({ 
            error: "Failed to create project",
            details: "Database operation failed"
          }, { status: 500 })
        }

        return NextResponse.json({ project: newProject })
      } catch (error) {
        console.error("Project creation error:", error)
        Sentry.captureException(error, {
          tags: { operation: "create_project" },
          extra: { request_url: request.url }
        })

        // Check if it's a Supabase configuration error
        if (error instanceof Error && error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          return NextResponse.json({ 
            error: "Service configuration error. Please contact support.",
            details: "Missing database credentials"
          }, { status: 503 })
        }

        return NextResponse.json({ 
          error: "Internal server error",
          details: "Unexpected error occurred"
        }, { status: 500 })
      }
    }
  )
}
