/**
 * @jest-environment node
 */

import { type NextRequest, NextResponse } from "next/server"
import { GET } from "./route"
import { supabaseAdmin } from "@/lib/supabase"
import * as Sentry from "@sentry/nextjs"
import { captureDbQuery, enhanceDbError } from "@/lib/sentry-db-monitor"

// Mock dependencies
jest.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

jest.mock("@sentry/nextjs", () => ({
  withServerActionInstrumentation: jest.fn((name, fn) => fn()),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}))

jest.mock("@/lib/sentry-db-monitor", () => ({
  captureDbQuery: jest.fn(),
  enhanceDbError: jest.fn(),
}))

describe("GET /api/transactions", () => {
  const mockUserId = "test-user-123"
  const mockTransactions = [
    {
      id: "txn-1",
      from_user_id: mockUserId,
      to_user_id: "user-2",
      amount: 100,
      created_at: "2025-01-15T10:00:00Z",
      merchant_projects: { name: "Test Merchant" },
    },
    {
      id: "txn-2",
      from_user_id: "user-3",
      to_user_id: mockUserId,
      amount: 50,
      created_at: "2025-01-14T10:00:00Z",
      merchant_projects: null,
    },
  ]

  let mockRequest: NextRequest
  let mockSupabaseChain: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default Supabase chain mock
    mockSupabaseChain = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockTransactions, error: null }),
    }

    ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockSupabaseChain)

    // Default captureDbQuery mock - executes the query function
    ;(captureDbQuery as jest.Mock).mockImplementation(
      async (queryType, table, queryFn) => {
        return await queryFn()
      }
    )
  })

  const createMockRequest = (userId: string | null): NextRequest => {
    const url = userId
      ? `http://localhost:3000/api/transactions?user_id=${userId}`
      : `http://localhost:3000/api/transactions`
    return new NextRequest(url)
  }

  describe("Happy Path - Successful Requests", () => {
    it("should return transactions for a valid user_id", async () => {
      mockRequest = createMockRequest(mockUserId)

      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toHaveProperty("transactions")
      expect(body.transactions).toHaveLength(2)
      expect(body.transactions[0]).toHaveProperty("merchant_name", "Test Merchant")
      expect(body.transactions[1]).toHaveProperty("merchant_name", null)
    })

    it("should call captureDbQuery with correct parameters", async () => {
      mockRequest = createMockRequest(mockUserId)

      await GET(mockRequest)

      expect(captureDbQuery).toHaveBeenCalledWith(
        "select_with_join",
        "transactions",
        expect.any(Function),
        {
          operation: "fetch_user_transactions",
          table: "transactions",
          userId: mockUserId,
          queryDetails: {
            join_table: "merchant_projects",
            filter_type: "user_transactions",
            limit: 50,
            order: "created_at desc",
          },
        }
      )
    })

    it("should query Supabase with correct filters and ordering", async () => {
      mockRequest = createMockRequest(mockUserId)

      await GET(mockRequest)

      expect(supabaseAdmin.from).toHaveBeenCalledWith("transactions")
      expect(mockSupabaseChain.select).toHaveBeenCalledWith(`
              *,
              merchant_projects(name)
            `)
      expect(mockSupabaseChain.or).toHaveBeenCalledWith(
        `from_user_id.eq.${mockUserId},to_user_id.eq.${mockUserId}`
      )
      expect(mockSupabaseChain.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      })
      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(50)
    })

    it("should enrich transactions with merchant_name from merchant_projects", async () => {
      mockRequest = createMockRequest(mockUserId)

      const response = await GET(mockRequest)
      const body = await response.json()

      expect(body.transactions[0].merchant_name).toBe("Test Merchant")
      expect(body.transactions[1].merchant_name).toBeNull()
    })

    it("should handle transactions with no merchant_projects gracefully", async () => {
      const txnsWithoutMerchants = [
        {
          id: "txn-1",
          from_user_id: mockUserId,
          to_user_id: "user-2",
          amount: 100,
          created_at: "2025-01-15T10:00:00Z",
          merchant_projects: null,
        },
      ]

      mockSupabaseChain.limit.mockResolvedValue({
        data: txnsWithoutMerchants,
        error: null,
      })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.transactions[0].merchant_name).toBeNull()
    })

    it("should return empty array when user has no transactions", async () => {
      mockSupabaseChain.limit.mockResolvedValue({ data: [], error: null })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.transactions).toEqual([])
    })

    it("should wrap execution in Sentry withServerActionInstrumentation", async () => {
      mockRequest = createMockRequest(mockUserId)

      await GET(mockRequest)

      expect(Sentry.withServerActionInstrumentation).toHaveBeenCalledWith(
        "transactions-get",
        expect.any(Function)
      )
    })
  })

  describe("Error Handling - Missing or Invalid Parameters", () => {
    it("should return 400 when user_id parameter is missing", async () => {
      mockRequest = createMockRequest(null)

      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body).toEqual({ error: "User ID required" })
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Missing user_id parameter in transactions request",
        "warning"
      )
    })

    it("should not query database when user_id is missing", async () => {
      mockRequest = createMockRequest(null)

      await GET(mockRequest)

      expect(supabaseAdmin.from).not.toHaveBeenCalled()
      expect(captureDbQuery).not.toHaveBeenCalled()
    })

    it("should handle empty string user_id as missing", async () => {
      mockRequest = createMockRequest("")

      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body).toEqual({ error: "User ID required" })
    })
  })

  describe("Database Errors - Permission and Access Issues", () => {
    it("should return 403 for PGRST301 permission error", async () => {
      const permissionError = {
        code: "PGRST301",
        message: "Permission denied",
      }

      mockSupabaseChain.limit.mockResolvedValue({
        data: null,
        error: permissionError,
      })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body).toEqual({
        error: "Access denied. Please check your authentication or contact support.",
        details: "Database permission error",
      })
      expect(enhanceDbError).toHaveBeenCalledWith(permissionError, {
        operation: "fetch_user_transactions",
        table: "transactions",
        userId: mockUserId,
        queryDetails: {
          join_table: "merchant_projects",
          filter_type: "user_transactions",
          limit: 50,
        },
      })
    })

    it("should return 403 for RLS policy error", async () => {
      const rlsError = {
        code: "42501",
        message: "RLS policy violation: permission denied for table transactions",
      }

      mockSupabaseChain.limit.mockResolvedValue({
        data: null,
        error: rlsError,
      })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error).toContain("Access denied")
    })

    it("should return 403 for generic permission denied error", async () => {
      const permError = {
        code: "CUSTOM",
        message: "permission denied for relation transactions",
      }

      mockSupabaseChain.limit.mockResolvedValue({
        data: null,
        error: permError,
      })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)

      expect(response.status).toBe(403)
    })

    it("should log error to console when database query fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
      const dbError = { code: "DB_ERROR", message: "Database connection failed" }

      mockSupabaseChain.limit.mockResolvedValue({
        data: null,
        error: dbError,
      })

      mockRequest = createMockRequest(mockUserId)
      await GET(mockRequest)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching transactions:",
        dbError
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("Database Errors - General Failures", () => {
    it("should return 500 for non-permission database errors", async () => {
      const dbError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      }

      mockSupabaseChain.limit.mockResolvedValue({
        data: null,
        error: dbError,
      })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body).toEqual({
        error: "Failed to fetch transactions",
        details: "Database query failed",
      })
    })

    it("should call enhanceDbError for any database error", async () => {
      const dbError = { code: "GENERIC", message: "Query failed" }

      mockSupabaseChain.limit.mockResolvedValue({
        data: null,
        error: dbError,
      })

      mockRequest = createMockRequest(mockUserId)
      await GET(mockRequest)

      expect(enhanceDbError).toHaveBeenCalledWith(dbError, {
        operation: "fetch_user_transactions",
        table: "transactions",
        userId: mockUserId,
        queryDetails: {
          join_table: "merchant_projects",
          filter_type: "user_transactions",
          limit: 50,
        },
      })
    })

    it("should handle null error message gracefully", async () => {
      const dbError = { code: "UNKNOWN", message: null }

      mockSupabaseChain.limit.mockResolvedValue({
        data: null,
        error: dbError,
      })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
    })
  })

  describe("Configuration and System Errors", () => {
    it("should return 503 for missing SUPABASE_SERVICE_ROLE_KEY error", async () => {
      const configError = new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
      )

      ;(captureDbQuery as jest.Mock).mockRejectedValue(configError)

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(503)
      expect(body).toEqual({
        error: "Service configuration error. Please contact support.",
        details: "Missing database credentials",
      })
      expect(Sentry.captureException).toHaveBeenCalledWith(configError, {
        tags: { operation: "fetch_transactions" },
        extra: { request_url: mockRequest.url },
      })
    })

    it("should return 500 for unexpected errors", async () => {
      const unexpectedError = new Error("Something went wrong")

      ;(captureDbQuery as jest.Mock).mockRejectedValue(unexpectedError)

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body).toEqual({
        error: "Internal server error",
        details: "Unexpected error occurred",
      })
    })

    it("should log unexpected errors to console", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
      const error = new Error("Unexpected error")

      ;(captureDbQuery as jest.Mock).mockRejectedValue(error)

      mockRequest = createMockRequest(mockUserId)
      await GET(mockRequest)

      expect(consoleErrorSpy).toHaveBeenCalledWith("Transactions API error:", error)
      consoleErrorSpy.mockRestore()
    })

    it("should capture unexpected errors in Sentry with context", async () => {
      const error = new Error("Unexpected error")

      ;(captureDbQuery as jest.Mock).mockRejectedValue(error)

      mockRequest = createMockRequest(mockUserId)
      await GET(mockRequest)

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: { operation: "fetch_transactions" },
        extra: { request_url: mockRequest.url },
      })
    })

    it("should handle non-Error thrown objects", async () => {
      const stringError = "Something went wrong"

      ;(captureDbQuery as jest.Mock).mockRejectedValue(stringError)

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe("Edge Cases and Special Scenarios", () => {
    it("should handle special characters in user_id", async () => {
      const specialUserId = "user-with-special-chars-@#$%"
      mockRequest = createMockRequest(encodeURIComponent(specialUserId))

      await GET(mockRequest)

      expect(mockSupabaseChain.or).toHaveBeenCalledWith(
        `from_user_id.eq.${specialUserId},to_user_id.eq.${specialUserId}`
      )
    })

    it("should handle very long user_id values", async () => {
      const longUserId = "a".repeat(1000)
      mockRequest = createMockRequest(longUserId)

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
      expect(captureDbQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ userId: longUserId })
      )
    })

    it("should handle transactions with malformed merchant_projects data", async () => {
      const malformedTxns = [
        {
          id: "txn-1",
          from_user_id: mockUserId,
          to_user_id: "user-2",
          amount: 100,
          created_at: "2025-01-15T10:00:00Z",
          merchant_projects: { name: undefined },
        },
      ]

      mockSupabaseChain.limit.mockResolvedValue({
        data: malformedTxns,
        error: null,
      })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.transactions[0].merchant_name).toBeNull()
    })

    it("should handle UUID format user_id", async () => {
      const uuidUserId = "550e8400-e29b-41d4-a716-446655440000"
      mockRequest = createMockRequest(uuidUserId)

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
    })

    it("should handle numeric user_id as string", async () => {
      const numericUserId = "12345"
      mockRequest = createMockRequest(numericUserId)

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
      expect(mockSupabaseChain.or).toHaveBeenCalledWith(
        `from_user_id.eq.${numericUserId},to_user_id.eq.${numericUserId}`
      )
    })

    it("should preserve all transaction properties during enrichment", async () => {
      const complexTransaction = {
        id: "txn-1",
        from_user_id: mockUserId,
        to_user_id: "user-2",
        amount: 100,
        currency: "USD",
        status: "completed",
        metadata: { note: "test" },
        created_at: "2025-01-15T10:00:00Z",
        merchant_projects: { name: "Merchant" },
      }

      mockSupabaseChain.limit.mockResolvedValue({
        data: [complexTransaction],
        error: null,
      })

      mockRequest = createMockRequest(mockUserId)
      const response = await GET(mockRequest)
      const body = await response.json()

      expect(body.transactions[0]).toMatchObject({
        id: "txn-1",
        from_user_id: mockUserId,
        to_user_id: "user-2",
        amount: 100,
        currency: "USD",
        status: "completed",
        metadata: { note: "test" },
        created_at: "2025-01-15T10:00:00Z",
        merchant_name: "Merchant",
      })
    })

    it("should handle URL with multiple query parameters", async () => {
      const url = `http://localhost:3000/api/transactions?user_id=${mockUserId}&extra=param&another=value`
      mockRequest = new NextRequest(url)

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
      expect(captureDbQuery).toHaveBeenCalled()
    })
  })

  describe("Response Format Validation", () => {
    it("should return valid JSON response structure", async () => {
      mockRequest = createMockRequest(mockUserId)

      const response = await GET(mockRequest)
      const body = await response.json()

      expect(body).toHaveProperty("transactions")
      expect(Array.isArray(body.transactions)).toBe(true)
    })

    it("should include Content-Type header for JSON", async () => {
      mockRequest = createMockRequest(mockUserId)

      const response = await GET(mockRequest)

      expect(response.headers.get("content-type")).toContain("application/json")
    })

    it("should return NextResponse instance", async () => {
      mockRequest = createMockRequest(mockUserId)

      const response = await GET(mockRequest)

      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe("Integration with Monitoring Tools", () => {
    it("should use captureDbQuery for database monitoring", async () => {
      mockRequest = createMockRequest(mockUserId)

      await GET(mockRequest)

      expect(captureDbQuery).toHaveBeenCalledTimes(1)
      expect(captureDbQuery).toHaveBeenCalledWith(
        "select_with_join",
        "transactions",
        expect.any(Function),
        expect.objectContaining({
          operation: "fetch_user_transactions",
          table: "transactions",
        })
      )
    })

    it("should call enhanceDbError only when database errors occur", async () => {
      mockRequest = createMockRequest(mockUserId)

      await GET(mockRequest)

      expect(enhanceDbError).not.toHaveBeenCalled()
    })

    it("should not call captureException for successful requests", async () => {
      mockRequest = createMockRequest(mockUserId)

      await GET(mockRequest)

      expect(Sentry.captureException).not.toHaveBeenCalled()
    })
  })

  describe("Limit and Ordering Behavior", () => {
    it("should limit results to 50 transactions", async () => {
      const manyTransactions = Array.from({ length: 100 }, (_, i) => ({
        id: `txn-${i}`,
        from_user_id: mockUserId,
        to_user_id: `user-${i}`,
        amount: i * 10,
        created_at: new Date(2025, 0, i + 1).toISOString(),
        merchant_projects: null,
      }))

      mockSupabaseChain.limit.mockResolvedValue({
        data: manyTransactions.slice(0, 50),
        error: null,
      })

      mockRequest = createMockRequest(mockUserId)
      await GET(mockRequest)

      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(50)
    })

    it("should order transactions by created_at descending", async () => {
      mockRequest = createMockRequest(mockUserId)

      await GET(mockRequest)

      expect(mockSupabaseChain.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      })
    })
  })
})