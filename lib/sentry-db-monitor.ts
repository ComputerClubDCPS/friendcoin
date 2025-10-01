import * as Sentry from "@sentry/nextjs"

interface DatabaseQueryContext {
  operation: string
  table: string
  userId?: string
  queryDetails?: Record<string, any>
}

interface DatabaseError {
  code?: string
  message?: string
  details?: any
  hint?: any
}

export function captureDbQuery(
  operation: string,
  table: string,
  query: () => Promise<any>,
  context: Partial<DatabaseQueryContext> = {}
) {
  return Sentry.withServerActionInstrumentation(
    `db-${operation}-${table}`,
    async () => {
      const startTime = Date.now()
      
      try {
        const result = await query()
        
        // Log successful query
        Sentry.addBreadcrumb({
          category: "database",
          message: `${operation} on ${table} completed successfully`,
          level: "info",
          data: {
            operation,
            table,
            duration: Date.now() - startTime,
            ...context
          }
        })
        
        return result
      } catch (error: any) {
        const duration = Date.now() - startTime
        
        // Enhanced error capture for database operations
        Sentry.captureException(error, {
          tags: {
            operation: `db_${operation}`,
            table,
            error_type: "database_error",
            error_code: error?.code || "unknown"
          },
          extra: {
            database_error: error,
            query_context: context,
            duration,
            operation_details: {
              operation,
              table,
              user_id: context.userId,
              query_details: context.queryDetails
            }
          },
          contexts: {
            database: {
              operation,
              table,
              duration,
              error_code: error?.code,
              error_message: error?.message
            }
          }
        })
        
        // Add breadcrumb for the failed query
        Sentry.addBreadcrumb({
          category: "database",
          message: `${operation} on ${table} failed`,
          level: "error",
          data: {
            operation,
            table,
            duration,
            error: error?.message,
            error_code: error?.code,
            ...context
          }
        })
        
        throw error
      }
    }
  )
}

export function enhanceDbError(
  error: DatabaseError,
  context: DatabaseQueryContext
): void {
  // Add additional context to database errors
  Sentry.setContext("database_operation", {
    operation: context.operation,
    table: context.table,
    user_id: context.userId,
    error_code: error.code,
    error_message: error.message,
    query_details: context.queryDetails
  })
  
  // Set tags for better filtering
  Sentry.setTags({
    db_operation: context.operation,
    db_table: context.table,
    db_error_code: error.code || "unknown"
  })
}

export function logDbTransaction(
  operation: string,
  tables: string[],
  userId?: string,
  additionalContext?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    category: "database_transaction",
    message: `Database transaction: ${operation} across ${tables.join(", ")}`,
    level: "info",
    data: {
      operation,
      tables,
      user_id: userId,
      ...additionalContext
    }
  })
}
