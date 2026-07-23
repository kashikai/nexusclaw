export class CountyHunterHttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CountyHunterHttpError'
    this.status = status
  }
}
