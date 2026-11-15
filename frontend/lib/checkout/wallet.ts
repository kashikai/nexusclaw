import { HDKey } from '@scure/bip32'
import { secp256k1 } from '@noble/curves/secp256k1'
import { bytesToHex } from 'viem'
import { publicKeyToAddress } from 'viem/accounts'
import { env } from './config'

// Deposit address for order #idx, derived from the account-level xpub
// (path m/44h/60h/0h). Only the PUBLIC key lives on the server, so it cannot spend.
export function depositAddress(idx: number): `0x${string}` {
  const child = HDKey.fromExtendedKey(env('CHECKOUT_XPUB')).derive(`m/0/${idx}`)
  if (!child.publicKey) throw new Error('Failed to derive public key')
  const uncompressed = secp256k1.ProjectivePoint.fromHex(child.publicKey).toRawBytes(false)
  return publicKeyToAddress(bytesToHex(uncompressed))
}
