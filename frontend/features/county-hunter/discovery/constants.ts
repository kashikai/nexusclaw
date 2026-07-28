export const GWINNETT_DISCOVERY_ADAPTER_VERSION = '1.0.0'
export const GWINNETT_DISCOVERY_ADAPTER_KEY = 'gwinnett-tax-sales'
export const GWINNETT_OFFICIAL_HOSTNAMES = ['www.gwinnetttaxcommissioner.com'] as const
export const GWINNETT_TAX_SALE_LANDING_URL =
  'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales'

export const COUNTY_HUNTER_DISCOVERY_LIMITS = {
  redirectCount: 5,
  timeoutMs: 15_000,
  landingBytes: 2_000_000,
  documentBytes: 10_000_000,
  rawRecordText: 2_048,
} as const

export const COUNTY_HUNTER_DISCOVERY_USER_AGENT =
  'NexusClaw-CountyHunter/1.0 (official-source discovery; contact via NexusClaw administrator)'
