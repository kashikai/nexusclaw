export class CountyHunterHttpError extends Error {
  status: number
  headers: Readonly<Record<string, string>>

  constructor(
    message: string,
    status: number,
    headers: Readonly<Record<string, string>> = {},
  ) {
    super(message)
    this.name = 'CountyHunterHttpError'
    this.status = status
    this.headers = headers
  }
}
