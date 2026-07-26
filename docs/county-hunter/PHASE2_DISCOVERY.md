# County Hunter Phase 2 — Gwinnett Discovery

## Scope

Phase 2 adds one manual, deterministic discovery adapter for one official
source: the Gwinnett County Tax Commissioner. It does not schedule background
jobs, place bids, move funds, modify agents, change wallet behavior or touch
contracts, ABIs, chain ID 8453, staking or production.

Greene County was rejected for this phase because its current official tax-sale
page did not publish a current property list in a publicly accessible,
parseable form. Historical Greene County records were not used.

## Official source

- Agency: Gwinnett County Tax Commissioner.
- Landing page:
  `https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales`
- Approved hostname: `www.gwinnetttaxcommissioner.com` (exact comparison).
- Document type: textual PDF discovered from the current "Upcoming Tax Sales"
  section.
- Adapter key: `gwinnett-tax-sales`.
- Adapter version: `1.0.0`.

The initial validation was recorded at `2026-07-26T15:27:44.4752969Z`:

| Resource | Final URL | Content type | Size | SHA-256 |
|---|---|---:|---:|---|
| Landing page | Same as the configured landing URL | `text/html; charset=UTF-8` | 133,786 bytes | `83b7d2a22edf6a11d71954f5b8dcb962f8f1cc69dc0677e578d2824b3e119ff6` |
| Current document | `https://www.gwinnetttaxcommissioner.com/documents/d/egov/august-2026-tax-sale-web-list` | `application/pdf` | 138,645 bytes | `ceb791ca26920f2c8f54a78e0658c2e19f3c47b811fad1ade69f99e8fd471062` |

Both requests returned HTTP 200 without redirects, authentication, cookies or
remote JavaScript execution. The one-page PDF yielded 1,681 characters of
embedded text and did not require OCR. The official site identifies itself as
the official website of the Gwinnett County Tax Commissioner.

These hashes are validation evidence, not permanent configuration. Every run
rediscovers the current document and stores new hashes. Likewise, August 4,
2026 is an initial fixture date, not a hard-coded sale date.

## Two-stage adapter

1. The landing-page adapter fetches the configured official page, finds links
   classified as current property lists, associates the sale date printed next
   to each link and rejects results, excess-funds, archives, historical lists,
   bidder information and instruction-only documents.
2. The PDF adapter downloads the selected official document, validates the PDF
   envelope, extracts embedded text without OCR and reads records by the
   published column coordinates.

If multiple plausible current lists exist, no document is selected silently.
The run becomes `review_required`, and sanitized candidate labels, URLs and
sale dates are preserved for an administrator.

## Published fields and limitations

The validated PDF publishes:

- PIN (parcel number);
- owner name;
- situs/property address;
- amount due;
- sale date.

The adapter preserves source order, page number, bounded raw text, the original
parcel number and its comparison-normalized form. Legal description, item
number, official notes and starting bid remain null when not published.

The adapter does not infer market value, resale value, total debt, liens, lien
priority, occupancy, physical condition, tax-deed guarantees, title quality or
buyer eligibility. It does not reinterpret "Amount Due" as "Starting Bid."

The stable record key uses the normalized parcel number first, then an explicit
official identifier, then a deterministic composition, and finally a stable
hash of bounded source text. Duplicate keys remain in the raw record table,
link to the first occurrence and produce `DUPLICATE_SOURCE_RECORD`.

## Snapshots, provenance and diff

Every run records the landing-page and document URLs, final URLs after
validated redirects, SHA-256 hashes, allowlisted response headers, content
types, sizes, fetch time, source `Last-Modified` when available, sale date and
adapter version. Raw snapshots are stored as base64 in a tenant-scoped,
append-only table; authenticated users receive only snapshot metadata through
the Data API.

A new snapshot is preserved even when:

- the landing page is unchanged and the PDF changes;
- the PDF URL is unchanged and its bytes change;
- the PDF URL changes but the bytes are identical.

Normalized records are classified as `added`, `changed`, `unchanged` or
`removed_from_current_source`. Removed records are retained. That classification
does not mean sold, paid, cancelled, legally withdrawn or transferred.

## Reason codes

- `NO_CURRENT_LIST`
- `MULTIPLE_CURRENT_LIST_CANDIDATES`
- `HISTORICAL_DOCUMENT_REJECTED`
- `RESULTS_DOCUMENT_REJECTED`
- `PDF_TEXT_UNAVAILABLE`
- `SALE_DATE_MISSING`
- `SALE_DATE_IN_PAST`
- `SOURCE_STRUCTURE_CHANGED`
- `OFFICIAL_DOMAIN_MISMATCH`
- `DOCUMENT_URL_REJECTED`
- `CONTENT_TYPE_REJECTED`
- `SOURCE_FETCH_FAILED`
- `DOCUMENT_FETCH_FAILED`
- `SOURCE_LOCKED`
- `DUPLICATE_SOURCE_RECORD`

A past sale date never deletes records. The run becomes `review_required` and
keeps both snapshots.

## Fetch security

Discovery runs only in the Node.js server route. Requests require HTTPS, an
exact approved hostname, public DNS answers and a bounded redirect chain whose
every target is revalidated. Localhost, `.local`, private, loopback,
link-local, multicast, reserved and metadata IP ranges are blocked.

The fetcher sends no cookies or authorization, uses an identifiable User-Agent,
does not execute JavaScript, applies a 15-second timeout, limits the landing
page to 2 MB and the PDF to 10 MB, and accepts only `text/html` and
`application/pdf` in their respective stages. Logs and API errors do not
contain session tokens, cookies, wallet details, signatures or environment
credentials.

## Authorization and tenancy

All new tables require `organization_id`, composite tenant foreign keys, RLS
and explicit Data API grants. Viewer can read permitted discovery metadata and
records. Manager keeps the existing ability to maintain manual sources but
cannot change the adapter-managed Gwinnett source or execute discovery. Admin
can configure the approved source and run discovery for the organization in
the trusted session.

The RPCs take no organization argument. They derive the organization from the
verified Supabase session and active membership. A source-scoped database lock
prevents concurrent runs. The authenticated user's access token is used for
PostgREST; no service role is present in the County Hunter runtime.

## Run states

`queued` → `fetching_source` → `fetching_document` → `parsing` →
`normalizing` → `comparing` → `completed`

A deterministic ambiguity becomes `review_required`. Fetch, parsing or
persistence failures become `failed`. A partially failed run is never marked
completed.

## Recovery and rollback

Operational recovery disables the managed Gwinnett source and lets an
outstanding source lock expire (maximum 15 minutes). The three discovery RPCs
can then be revoked. Runs, snapshots, raw records, normalized properties,
changes and audit logs remain preserved.

Destructive rollback is intentionally excluded. Dropping discovery tables or
deleting provenance requires a separate reviewed migration.

## Outside scope

- other Georgia counties;
- OCR;
- schedulers, queues or autonomous agents;
- automated bidding or purchaser workflows;
- assessor, GIS, clerk, newspaper or third-party enrichment;
- legal, title, occupancy or valuation conclusions;
- production deployment.
