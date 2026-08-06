import { randomBytes } from 'node:crypto'

export function createEphemeralE2EClientIp() {
  const bytes = randomBytes(16)
  const groups = []

  for (let offset = 0; offset < bytes.length; offset += 2) {
    groups.push(bytes.readUInt16BE(offset).toString(16))
  }

  return groups.join(':')
}
