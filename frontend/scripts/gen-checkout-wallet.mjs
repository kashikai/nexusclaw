// One-time: generate the checkout HD wallet.
//   node scripts/gen-checkout-wallet.mjs
// Prints a NEW seed phrase (write it down OFFLINE, never commit/paste it anywhere)
// and the account-level xpub to put in CHECKOUT_XPUB on Vercel.
// Run on your own machine. Every order gets its own address derived from the xpub;
// only the seed phrase can spend from them.
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { HDKey } from '@scure/bip32'

const mnemonic = generateMnemonic(wordlist, 256)
const account = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derive("m/44'/60'/0'")

console.log('\nSEED PHRASE (store offline, shown only once):\n')
console.log(mnemonic)
console.log('\nCHECKOUT_XPUB (safe for the server, public key only):\n')
console.log(account.publicExtendedKey, '\n')
