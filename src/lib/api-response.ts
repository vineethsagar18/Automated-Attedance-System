import { NextResponse } from 'next/server'

/**
 * Unified API response helpers.
 * Every route should return ok() or fail() for consistent response format.
 */

export function ok<T>(
  data: T,
  message?: string,
  status = 200,
  legacyFields?: Record<string, unknown>
) {
  return NextResponse.json(
    { status: 'success', message: message ?? 'OK', data, ...(legacyFields ?? {}) },
    { status }
  )
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { status: 'error', message, code: code ?? 'BAD_REQUEST' },
    { status }
  )
}

export function unauthorized(message = 'Unauthorized') {
  return fail(message, 401, 'UNAUTHORIZED')
}

export function notFound(message = 'Not found') {
  return fail(message, 404, 'NOT_FOUND')
}

export function conflict(message: string) {
  return fail(message, 409, 'CONFLICT')
}
