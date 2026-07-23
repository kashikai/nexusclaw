import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { CountyHunterHttpError } from './http-error'
import type {
  CountyHunterChallengeRecord,
  CountyHunterChallengeRepository,
} from './siwe'

export function createCountyHunterChallengeRepository(): CountyHunterChallengeRepository {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) {
    throw new CountyHunterHttpError('County Hunter wallet authentication is not configured.', 503)
  }

  const preAuthClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })

  return {
    async create(record: CountyHunterChallengeRecord) {
      const { error } = await preAuthClient.rpc('county_hunter_issue_auth_challenge', {
        p_id: record.id,
        p_nonce_hash: record.nonceHash,
        p_wallet_address: record.walletAddress,
        p_domain: record.domain,
        p_uri: record.uri,
        p_chain_id: record.chainId,
        p_expires_at: record.expiresAt,
        p_created_at: record.createdAt,
      })
      if (error) {
        if (error.code === 'P0001') {
          throw new CountyHunterHttpError('Too many wallet authentication attempts. Try again later.', 429)
        }
        throw new CountyHunterHttpError('Unable to create a wallet authentication challenge.', 503)
      }
    },

    async consume(match) {
      const { data, error } = await preAuthClient.rpc('county_hunter_consume_auth_challenge', {
        p_id: match.id,
        p_nonce_hash: match.nonceHash,
        p_wallet_address: match.walletAddress,
        p_domain: match.domain,
        p_uri: match.uri,
        p_chain_id: match.chainId,
        p_now: match.now,
      })

      if (error) {
        throw new CountyHunterHttpError('Unable to consume the wallet authentication challenge.', 503)
      }
      return data === true
    },
  }
}
