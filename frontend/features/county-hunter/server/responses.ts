import { NextResponse } from 'next/server'
import { CountyHunterValidationError } from '../validation'
import { CountyHunterDiscoveryError } from '../discovery/types'
import { COUNTY_HUNTER_NO_STORE_HEADERS } from './cache-control'
import { CountyHunterHttpError } from './http-error'
import { logCountyHunterEvent } from './operational-logging'

export function countyHunterErrorResponse(error: unknown): NextResponse {
  if (error instanceof CountyHunterDiscoveryError) {
    return NextResponse.json(
      { error: error.message, reasonCode: error.reasonCode },
      {
        status: error.reasonCode === 'SOURCE_LOCKED' ? 409 : 422,
        headers: COUNTY_HUNTER_NO_STORE_HEADERS,
      },
    )
  }
  if (error instanceof CountyHunterHttpError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          ...COUNTY_HUNTER_NO_STORE_HEADERS,
          ...error.headers,
        },
      },
    )
  }
  if (error instanceof CountyHunterValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: 400, headers: COUNTY_HUNTER_NO_STORE_HEADERS },
    )
  }
  logCountyHunterEvent(
    'request_failed',
    {
      operation: 'request',
      outcome: 'failed',
      reasonCode: 'UNEXPECTED',
    },
    'error',
  )
  return NextResponse.json(
    { error: 'Unexpected County Hunter error.' },
    { status: 500, headers: COUNTY_HUNTER_NO_STORE_HEADERS },
  )
}
