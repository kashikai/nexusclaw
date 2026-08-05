import 'server-only'

import { CountyHunterHttpError } from './http-error'

export const COUNTY_HUNTER_CHALLENGE_BODY_LIMIT = 512
export const COUNTY_HUNTER_VERIFY_BODY_LIMIT = 8 * 1024

export function assertCountyHunterSiweOrigin(
  request: Request,
  expectedOrigin: string,
): void {
  const requestOrigin = request.headers.get('origin')
  if (requestOrigin !== expectedOrigin) {
    throw new CountyHunterHttpError('The wallet authentication origin is invalid.', 403)
  }
}

export async function readCountyHunterSiweJson(
  request: Request,
  maximumBytes: number,
): Promise<unknown> {
  const mediaType = request.headers
    .get('content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase()
  if (mediaType !== 'application/json') {
    throw new CountyHunterHttpError(
      'Wallet authentication requests must use application/json.',
      415,
    )
  }

  const contentLength = request.headers.get('content-length')
  if (contentLength !== null) {
    const parsedLength = Number(contentLength)
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new CountyHunterHttpError('The wallet authentication request is invalid.', 400)
    }
    if (parsedLength > maximumBytes) {
      throw new CountyHunterHttpError('The wallet authentication request is too large.', 413)
    }
  }

  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
    throw new CountyHunterHttpError('The wallet authentication request is too large.', 413)
  }

  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    throw new CountyHunterHttpError('The wallet authentication request is invalid.', 400)
  }
}
