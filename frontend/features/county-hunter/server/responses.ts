import { NextResponse } from 'next/server'
import { CountyHunterValidationError } from '../validation'
import { COUNTY_HUNTER_NO_STORE_HEADERS } from './cache-control'
import { CountyHunterHttpError } from './http-error'

export function countyHunterErrorResponse(error: unknown): NextResponse {
  if (error instanceof CountyHunterHttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: COUNTY_HUNTER_NO_STORE_HEADERS },
    )
  }
  if (error instanceof CountyHunterValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: 400, headers: COUNTY_HUNTER_NO_STORE_HEADERS },
    )
  }
  console.error('[county-hunter] Unhandled request error', error)
  return NextResponse.json(
    { error: 'Unexpected County Hunter error.' },
    { status: 500, headers: COUNTY_HUNTER_NO_STORE_HEADERS },
  )
}
