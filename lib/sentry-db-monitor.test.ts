import * as Sentry from "@sentry/nextjs"
import { captureDbQuery, enhanceDbError, logDbTransaction } from "./sentry-db-monitor"

// Mock Sentry module
jest.mock("@sentry/nextjs", () => ({
  withServerActionInstrumentation: jest.fn((name, callback) => callback()),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  setContext: jest.fn(),
  setTags: jest.fn(),
}))

describe("sentry-db-monitor", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, "now").mockReturnValue(1000000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("captureDbQuery", () => {
    describe("successful queries", () => {
      it("should execute query and return result on success", async () => {
        const mockResult = { id: 1, name: "test" }
        const mockQuery = jest.fn().mockResolvedValue(mockResult)

        const result = await captureDbQuery("SELECT", "users", mockQuery)

        expect(result).toEqual(mockResult)
        expect(mockQuery).toHaveBeenCalledTimes(1)
      })

      it("should add breadcrumb for successful query", async () => {
        const mockQuery = jest.fn().mockResolvedValue({ success: true })
        
        await captureDbQuery("INSERT", "posts", mockQuery)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database",
          message: "INSERT on posts completed successfully",
          level: "info",
          data: {
            operation: "INSERT",
            table: "posts",
            duration: 0,
          }
        })
      })

      it("should include additional context in breadcrumb", async () => {
        const mockQuery = jest.fn().mockResolvedValue([])
        const context = {
          userId: "user-123",
          queryDetails: { limit: 10, offset: 0 }
        }

        await captureDbQuery("SELECT", "orders", mockQuery, context)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database",
          message: "SELECT on orders completed successfully",
          level: "info",
          data: {
            operation: "SELECT",
            table: "orders",
            duration: 0,
            userId: "user-123",
            queryDetails: { limit: 10, offset: 0 }
          }
        })
      })

      it("should calculate query duration correctly", async () => {
        const mockQuery = jest.fn().mockResolvedValue({ data: "test" })
        const dateSpy = jest.spyOn(Date, "now")
        dateSpy.mockReturnValueOnce(1000000)
        dateSpy.mockReturnValueOnce(1002500)

        await captureDbQuery("UPDATE", "settings", mockQuery)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              duration: 2500
            })
          })
        )
      })

      it("should wrap query with withServerActionInstrumentation", async () => {
        const mockQuery = jest.fn().mockResolvedValue(null)

        await captureDbQuery("DELETE", "cache", mockQuery)

        expect(Sentry.withServerActionInstrumentation).toHaveBeenCalledWith(
          "db-DELETE-cache",
          expect.any(Function)
        )
      })

      it("should handle query returning null", async () => {
        const mockQuery = jest.fn().mockResolvedValue(null)

        const result = await captureDbQuery("SELECT", "users", mockQuery)

        expect(result).toBeNull()
        expect(Sentry.addBreadcrumb).toHaveBeenCalled()
      })

      it("should handle query returning undefined", async () => {
        const mockQuery = jest.fn().mockResolvedValue(undefined)

        const result = await captureDbQuery("SELECT", "users", mockQuery)

        expect(result).toBeUndefined()
        expect(Sentry.addBreadcrumb).toHaveBeenCalled()
      })

      it("should handle query returning empty array", async () => {
        const mockQuery = jest.fn().mockResolvedValue([])

        const result = await captureDbQuery("SELECT", "users", mockQuery)

        expect(result).toEqual([])
        expect(Sentry.addBreadcrumb).toHaveBeenCalled()
      })

      it("should handle query returning complex nested objects", async () => {
        const complexResult = {
          user: { id: 1, profile: { name: "John", settings: { theme: "dark" } } },
          metadata: { count: 100, pagination: { page: 1, total: 10 } }
        }
        const mockQuery = jest.fn().mockResolvedValue(complexResult)

        const result = await captureDbQuery("SELECT", "users", mockQuery)

        expect(result).toEqual(complexResult)
      })
    })

    describe("failed queries", () => {
      it("should capture exception on query failure", async () => {
        const error = new Error("Database connection failed")
        const mockQuery = jest.fn().mockRejectedValue(error)

        await expect(captureDbQuery("SELECT", "users", mockQuery)).rejects.toThrow(error)

        expect(Sentry.captureException).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            tags: {
              operation: "db_SELECT",
              table: "users",
              error_type: "database_error",
              error_code: "unknown"
            }
          })
        )
      })

      it("should include error code in tags when available", async () => {
        const error: any = new Error("Unique constraint violation")
        error.code = "23505"
        const mockQuery = jest.fn().mockRejectedValue(error)

        await expect(captureDbQuery("INSERT", "users", mockQuery)).rejects.toThrow()

        expect(Sentry.captureException).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            tags: expect.objectContaining({
              error_code: "23505"
            })
          })
        )
      })

      it("should capture extra context on error", async () => {
        const error = new Error("Query timeout")
        const mockQuery = jest.fn().mockRejectedValue(error)
        const context = {
          userId: "user-456",
          queryDetails: { filters: { status: "active" } }
        }

        await expect(captureDbQuery("SELECT", "sessions", mockQuery, context)).rejects.toThrow()

        expect(Sentry.captureException).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            extra: expect.objectContaining({
              query_context: context,
              operation_details: {
                operation: "SELECT",
                table: "sessions",
                user_id: "user-456",
                query_details: { filters: { status: "active" } }
              }
            })
          })
        )
      })

      it("should add error breadcrumb on failure", async () => {
        const error = new Error("Connection timeout")
        const mockQuery = jest.fn().mockRejectedValue(error)

        await expect(captureDbQuery("UPDATE", "posts", mockQuery)).rejects.toThrow()

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database",
          message: "UPDATE on posts failed",
          level: "error",
          data: {
            operation: "UPDATE",
            table: "posts",
            duration: 0,
            error: "Connection timeout",
            error_code: undefined
          }
        })
      })

      it("should include error code in breadcrumb when available", async () => {
        const error: any = new Error("Foreign key violation")
        error.code = "23503"
        const mockQuery = jest.fn().mockRejectedValue(error)

        await expect(captureDbQuery("DELETE", "comments", mockQuery)).rejects.toThrow()

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              error_code: "23503"
            })
          })
        )
      })

      it("should calculate duration for failed queries", async () => {
        const error = new Error("Query error")
        const mockQuery = jest.fn().mockRejectedValue(error)
        const dateSpy = jest.spyOn(Date, "now")
        dateSpy.mockReturnValueOnce(1000000)
        dateSpy.mockReturnValueOnce(1001500)

        await expect(captureDbQuery("SELECT", "users", mockQuery)).rejects.toThrow()

        expect(Sentry.captureException).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            extra: expect.objectContaining({
              duration: 1500
            })
          })
        )
      })

      it("should set database context on error", async () => {
        const error: any = new Error("Database error")
        error.code = "ER_ACCESS_DENIED"
        error.message = "Access denied"
        const mockQuery = jest.fn().mockRejectedValue(error)

        await expect(captureDbQuery("SELECT", "sensitive", mockQuery)).rejects.toThrow()

        expect(Sentry.captureException).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            contexts: {
              database: {
                operation: "SELECT",
                table: "sensitive",
                duration: 0,
                error_code: "ER_ACCESS_DENIED",
                error_message: "Access denied"
              }
            }
          })
        )
      })

      it("should re-throw the original error", async () => {
        const originalError = new Error("Original error message")
        const mockQuery = jest.fn().mockRejectedValue(originalError)

        await expect(captureDbQuery("SELECT", "users", mockQuery)).rejects.toBe(originalError)
      })

      it("should handle errors without message property", async () => {
        const error: any = { code: "UNKNOWN" }
        const mockQuery = jest.fn().mockRejectedValue(error)

        await expect(captureDbQuery("SELECT", "users", mockQuery)).rejects.toThrow()

        expect(Sentry.captureException).toHaveBeenCalled()
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              error: undefined
            })
          })
        )
      })

      it("should handle string errors", async () => {
        const mockQuery = jest.fn().mockRejectedValue("String error")

        await expect(captureDbQuery("SELECT", "users", mockQuery)).rejects.toThrow()

        expect(Sentry.captureException).toHaveBeenCalled()
      })
    })

    describe("edge cases", () => {
      it("should handle empty operation string", async () => {
        const mockQuery = jest.fn().mockResolvedValue({})

        await captureDbQuery("", "users", mockQuery)

        expect(Sentry.withServerActionInstrumentation).toHaveBeenCalledWith(
          "db--users",
          expect.any(Function)
        )
      })

      it("should handle empty table name", async () => {
        const mockQuery = jest.fn().mockResolvedValue({})

        await captureDbQuery("SELECT", "", mockQuery)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "SELECT on  completed successfully"
          })
        )
      })

      it("should handle special characters in operation and table", async () => {
        const mockQuery = jest.fn().mockResolvedValue({})

        await captureDbQuery("SELECT-JOIN", "user$_table", mockQuery)

        expect(Sentry.withServerActionInstrumentation).toHaveBeenCalledWith(
          "db-SELECT-JOIN-user$_table",
          expect.any(Function)
        )
      })

      it("should handle empty context object", async () => {
        const mockQuery = jest.fn().mockResolvedValue({})

        await captureDbQuery("SELECT", "users", mockQuery, {})

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              operation: "SELECT",
              table: "users"
            })
          })
        )
      })

      it("should handle context with only userId", async () => {
        const mockQuery = jest.fn().mockResolvedValue({})

        await captureDbQuery("SELECT", "users", mockQuery, { userId: "test-user" })

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: "test-user"
            })
          })
        )
      })

      it("should handle context with only queryDetails", async () => {
        const mockQuery = jest.fn().mockResolvedValue({})

        await captureDbQuery("SELECT", "users", mockQuery, { 
          queryDetails: { where: "id > 100" } 
        })

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              queryDetails: { where: "id > 100" }
            })
          })
        )
      })

      it("should handle very long query durations", async () => {
        const mockQuery = jest.fn().mockResolvedValue({})
        const dateSpy = jest.spyOn(Date, "now")
        dateSpy.mockReturnValueOnce(1000000)
        dateSpy.mockReturnValueOnce(1000000 + 3600000) // 1 hour later

        await captureDbQuery("SELECT", "large_table", mockQuery)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              duration: 3600000
            })
          })
        )
      })
    })

    describe("concurrent query handling", () => {
      it("should handle multiple concurrent queries", async () => {
        const mockQuery1 = jest.fn().mockResolvedValue({ id: 1 })
        const mockQuery2 = jest.fn().mockResolvedValue({ id: 2 })
        const mockQuery3 = jest.fn().mockResolvedValue({ id: 3 })

        const results = await Promise.all([
          captureDbQuery("SELECT", "users", mockQuery1),
          captureDbQuery("SELECT", "posts", mockQuery2),
          captureDbQuery("SELECT", "comments", mockQuery3)
        ])

        expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
        expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(3)
      })

      it("should handle mix of successful and failed concurrent queries", async () => {
        const mockQuery1 = jest.fn().mockResolvedValue({ success: true })
        const mockQuery2 = jest.fn().mockRejectedValue(new Error("Failed"))
        const mockQuery3 = jest.fn().mockResolvedValue({ success: true })

        const results = await Promise.allSettled([
          captureDbQuery("SELECT", "users", mockQuery1),
          captureDbQuery("SELECT", "posts", mockQuery2),
          captureDbQuery("SELECT", "comments", mockQuery3)
        ])

        expect(results[0].status).toBe("fulfilled")
        expect(results[1].status).toBe("rejected")
        expect(results[2].status).toBe("fulfilled")
        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("enhanceDbError", () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe("setting database context", () => {
      it("should set database operation context", () => {
        const error = {
          code: "23505",
          message: "Duplicate key violation"
        }
        const context = {
          operation: "INSERT",
          table: "users",
          userId: "user-123"
        }

        enhanceDbError(error, context)

        expect(Sentry.setContext).toHaveBeenCalledWith("database_operation", {
          operation: "INSERT",
          table: "users",
          user_id: "user-123",
          error_code: "23505",
          error_message: "Duplicate key violation",
          query_details: undefined
        })
      })

      it("should include query details in context", () => {
        const error = {
          code: "ER_LOCK_TIMEOUT",
          message: "Lock wait timeout exceeded"
        }
        const context = {
          operation: "UPDATE",
          table: "orders",
          userId: "user-456",
          queryDetails: {
            where: { id: 100 },
            set: { status: "completed" }
          }
        }

        enhanceDbError(error, context)

        expect(Sentry.setContext).toHaveBeenCalledWith("database_operation", 
          expect.objectContaining({
            query_details: {
              where: { id: 100 },
              set: { status: "completed" }
            }
          })
        )
      })

      it("should handle error without code", () => {
        const error = {
          message: "Unknown error"
        }
        const context = {
          operation: "DELETE",
          table: "sessions"
        }

        enhanceDbError(error, context)

        expect(Sentry.setContext).toHaveBeenCalledWith("database_operation",
          expect.objectContaining({
            error_code: undefined
          })
        )
      })

      it("should handle error without message", () => {
        const error = {
          code: "UNKNOWN"
        }
        const context = {
          operation: "SELECT",
          table: "logs"
        }

        enhanceDbError(error, context)

        expect(Sentry.setContext).toHaveBeenCalledWith("database_operation",
          expect.objectContaining({
            error_message: undefined
          })
        )
      })

      it("should handle empty error object", () => {
        const error = {}
        const context = {
          operation: "SELECT",
          table: "users"
        }

        enhanceDbError(error, context)

        expect(Sentry.setContext).toHaveBeenCalledWith("database_operation",
          expect.objectContaining({
            error_code: undefined,
            error_message: undefined
          })
        )
      })
    })

    describe("setting tags", () => {
      it("should set appropriate tags", () => {
        const error = {
          code: "23503",
          message: "Foreign key violation"
        }
        const context = {
          operation: "DELETE",
          table: "comments"
        }

        enhanceDbError(error, context)

        expect(Sentry.setTags).toHaveBeenCalledWith({
          db_operation: "DELETE",
          db_table: "comments",
          db_error_code: "23503"
        })
      })

      it("should use 'unknown' as default error code in tags", () => {
        const error = {
          message: "Error without code"
        }
        const context = {
          operation: "UPDATE",
          table: "posts"
        }

        enhanceDbError(error, context)

        expect(Sentry.setTags).toHaveBeenCalledWith(
          expect.objectContaining({
            db_error_code: "unknown"
          })
        )
      })

      it("should handle empty strings in context", () => {
        const error = { code: "ERR" }
        const context = {
          operation: "",
          table: ""
        }

        enhanceDbError(error, context)

        expect(Sentry.setTags).toHaveBeenCalledWith({
          db_operation: "",
          db_table: "",
          db_error_code: "ERR"
        })
      })
    })

    describe("edge cases", () => {
      it("should handle context without userId", () => {
        const error = { code: "ERR" }
        const context = {
          operation: "SELECT",
          table: "users"
        }

        enhanceDbError(error, context)

        expect(Sentry.setContext).toHaveBeenCalledWith("database_operation",
          expect.objectContaining({
            user_id: undefined
          })
        )
      })

      it("should handle special characters in table and operation", () => {
        const error = { code: "ERR" }
        const context = {
          operation: "SELECT-JOIN",
          table: "user$_posts"
        }

        enhanceDbError(error, context)

        expect(Sentry.setTags).toHaveBeenCalledWith(
          expect.objectContaining({
            db_operation: "SELECT-JOIN",
            db_table: "user$_posts"
          })
        )
      })

      it("should handle numeric error codes", () => {
        const error: any = { code: 1234 }
        const context = {
          operation: "INSERT",
          table: "logs"
        }

        enhanceDbError(error, context)

        expect(Sentry.setTags).toHaveBeenCalledWith(
          expect.objectContaining({
            db_error_code: 1234
          })
        )
      })

      it("should handle error with additional properties", () => {
        const error = {
          code: "ERR",
          message: "Error",
          details: { extra: "info" },
          hint: "Try again"
        }
        const context = {
          operation: "UPDATE",
          table: "settings"
        }

        enhanceDbError(error, context)

        expect(Sentry.setContext).toHaveBeenCalled()
        expect(Sentry.setTags).toHaveBeenCalled()
      })
    })
  })

  describe("logDbTransaction", () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe("basic transaction logging", () => {
      it("should log transaction with single table", () => {
        logDbTransaction("COMMIT", ["users"])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database_transaction",
          message: "Database transaction: COMMIT across users",
          level: "info",
          data: {
            operation: "COMMIT",
            tables: ["users"],
            user_id: undefined
          }
        })
      })

      it("should log transaction with multiple tables", () => {
        logDbTransaction("ROLLBACK", ["users", "posts", "comments"])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database_transaction",
          message: "Database transaction: ROLLBACK across users, posts, comments",
          level: "info",
          data: {
            operation: "ROLLBACK",
            tables: ["users", "posts", "comments"],
            user_id: undefined
          }
        })
      })

      it("should include userId when provided", () => {
        logDbTransaction("BEGIN", ["orders"], "user-789")

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database_transaction",
          message: "Database transaction: BEGIN across orders",
          level: "info",
          data: {
            operation: "BEGIN",
            tables: ["orders"],
            user_id: "user-789"
          }
        })
      })

      it("should include additional context when provided", () => {
        const additionalContext = {
          isolation_level: "READ_COMMITTED",
          timeout: 30000
        }

        logDbTransaction("START", ["transactions"], "user-101", additionalContext)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database_transaction",
          message: "Database transaction: START across transactions",
          level: "info",
          data: {
            operation: "START",
            tables: ["transactions"],
            user_id: "user-101",
            isolation_level: "READ_COMMITTED",
            timeout: 30000
          }
        })
      })
    })

    describe("edge cases", () => {
      it("should handle empty tables array", () => {
        logDbTransaction("COMMIT", [])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database_transaction",
          message: "Database transaction: COMMIT across ",
          level: "info",
          data: {
            operation: "COMMIT",
            tables: [],
            user_id: undefined
          }
        })
      })

      it("should handle empty operation string", () => {
        logDbTransaction("", ["users"])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database_transaction",
          message: "Database transaction:  across users",
          level: "info",
          data: {
            operation: "",
            tables: ["users"],
            user_id: undefined
          }
        })
      })

      it("should handle undefined userId", () => {
        logDbTransaction("COMMIT", ["users"], undefined)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              user_id: undefined
            })
          })
        )
      })

      it("should handle empty additionalContext", () => {
        logDbTransaction("COMMIT", ["users"], "user-123", {})

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database_transaction",
          message: "Database transaction: COMMIT across users",
          level: "info",
          data: {
            operation: "COMMIT",
            tables: ["users"],
            user_id: "user-123"
          }
        })
      })

      it("should handle undefined additionalContext", () => {
        logDbTransaction("COMMIT", ["users"], "user-123", undefined)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "database_transaction",
          message: "Database transaction: COMMIT across users",
          level: "info",
          data: {
            operation: "COMMIT",
            tables: ["users"],
            user_id: "user-123"
          }
        })
      })

      it("should handle tables with special characters", () => {
        logDbTransaction("COMMIT", ["user$_data", "post#123", "comment@temp"])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Database transaction: COMMIT across user$_data, post#123, comment@temp"
          })
        )
      })

      it("should handle very long operation names", () => {
        const longOperation = "A".repeat(200)
        logDbTransaction(longOperation, ["users"])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              operation: longOperation
            })
          })
        )
      })

      it("should handle many tables", () => {
        const manyTables = Array.from({ length: 50 }, (_, i) => `table_${i}`)
        logDbTransaction("COMMIT", manyTables)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              tables: manyTables
            })
          })
        )
      })

      it("should handle complex additionalContext with nested objects", () => {
        const complexContext = {
          metadata: {
            nested: {
              deep: {
                value: 123
              }
            }
          },
          arrays: [1, 2, 3],
          nullValue: null
        }

        logDbTransaction("COMMIT", ["users"], "user-123", complexContext)

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              metadata: complexContext.metadata,
              arrays: complexContext.arrays,
              nullValue: null
            })
          })
        )
      })
    })

    describe("different transaction operations", () => {
      it("should log BEGIN transaction", () => {
        logDbTransaction("BEGIN", ["users", "sessions"])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Database transaction: BEGIN across users, sessions"
          })
        )
      })

      it("should log COMMIT transaction", () => {
        logDbTransaction("COMMIT", ["orders", "payments"])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Database transaction: COMMIT across orders, payments"
          })
        )
      })

      it("should log ROLLBACK transaction", () => {
        logDbTransaction("ROLLBACK", ["inventory", "reservations"])

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Database transaction: ROLLBACK across inventory, reservations"
          })
        )
      })

      it("should log SAVEPOINT transaction", () => {
        logDbTransaction("SAVEPOINT", ["users"], undefined, { savepoint_name: "sp1" })

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              savepoint_name: "sp1"
            })
          })
        )
      })
    })
  })

  describe("integration scenarios", () => {
    it("should work together for a complete database operation flow", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ id: 1 })
      
      // Start transaction
      logDbTransaction("BEGIN", ["users", "profiles"], "user-999")
      
      // Execute query
      await captureDbQuery("INSERT", "users", mockQuery, { userId: "user-999" })
      
      // Enhance error (simulated)
      const error = { code: "23505", message: "Duplicate" }
      enhanceDbError(error, { operation: "INSERT", table: "users", userId: "user-999" })
      
      // End transaction
      logDbTransaction("COMMIT", ["users", "profiles"], "user-999")

      expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(3) // 2 transaction logs + 1 query log
      expect(Sentry.setContext).toHaveBeenCalledTimes(1)
      expect(Sentry.setTags).toHaveBeenCalledTimes(1)
    })

    it("should handle failed transaction with error enhancement", async () => {
      const error = new Error("Transaction failed")
      const mockQuery = jest.fn().mockRejectedValue(error)
      
      logDbTransaction("BEGIN", ["orders"], "user-888")
      
      await expect(
        captureDbQuery("UPDATE", "orders", mockQuery, { userId: "user-888" })
      ).rejects.toThrow()
      
      logDbTransaction("ROLLBACK", ["orders"], "user-888")

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(3) // BEGIN, error, ROLLBACK
    })
  })
})