# County Hunter RLS matrix

This is the migration/contract matrix, not a claim of real staging execution.
Static tests pass. The Fase 1.3 staging run is still **NOT RUN** because no
dedicated project credentials are configured locally.

Every table is prefixed with `county_hunter_`, has RLS enabled and forced, and denies `anon`. Except for the membership row noted below, `same org` means `organization_id = county_hunter_current_organization_id()`. That function reads only the signed Supabase JWT `app_metadata.organization_id`; a missing or malformed claim evaluates to no organization.

`admin` is an explicit superset in `county_hunter_has_permission`. All other permissions are independent and must be present in the active membership row. A dash means there is no application grant and no RLS policy for that operation.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `county_hunter_states` | `view`, same org — `county_hunter_states_select` | `manage`, same org — `county_hunter_states_insert` | `manage`, same org before/after — `county_hunter_states_update` | `admin`, same org — `county_hunter_states_delete` |
| `county_hunter_counties` | `view`, same org — `county_hunter_counties_select` | `manage`, same org — `county_hunter_counties_insert` | `manage`, same org before/after — `county_hunter_counties_update` | `admin`, same org — `county_hunter_counties_delete` |
| `county_hunter_sources` | `view`, same org — `county_hunter_sources_select` | `manage`, same org — `county_hunter_sources_insert` | `manage`, same org before/after — `county_hunter_sources_update` | `admin`, same org — `county_hunter_sources_delete` |
| `county_hunter_auctions` | `view`, same org — `county_hunter_auctions_select` | `manage`, same org — `county_hunter_auctions_insert` | `manage`, same org before/after — `county_hunter_auctions_update` | `admin`, same org — `county_hunter_auctions_delete` |
| `county_hunter_auction_sources` | `view`, same org — `county_hunter_auction_sources_select` | `manage`, same org — `county_hunter_auction_sources_insert` | `manage`, same org before/after — `county_hunter_auction_sources_update` | `admin`, same org — `county_hunter_auction_sources_delete` |
| `county_hunter_properties` | `view`, same org — `county_hunter_properties_select` | `manage`, same org — `county_hunter_properties_insert` | `manage`, same org before/after — `county_hunter_properties_update` | `admin`, same org — `county_hunter_properties_delete` |
| `county_hunter_parcel_matches` | `view`, same org — `county_hunter_parcel_matches_select` | `manage`, same org — `county_hunter_parcel_matches_insert` | `manage`, same org before/after — `county_hunter_parcel_matches_update` | `admin`, same org — `county_hunter_parcel_matches_delete` |
| `county_hunter_property_snapshots` | `view`, same org — `county_hunter_property_snapshots_select` | `manage`, same org — `county_hunter_property_snapshots_insert` | `manage`, same org before/after — `county_hunter_property_snapshots_update` | `admin`, same org — `county_hunter_property_snapshots_delete` |
| `county_hunter_risk_assessments` | `view`, same org — `county_hunter_risk_assessments_select` | `manage`, same org — `county_hunter_risk_assessments_insert` | `manage`, same org before/after — `county_hunter_risk_assessments_update` | `admin`, same org — `county_hunter_risk_assessments_delete` |
| `county_hunter_valuation_scenarios` | `view`, same org — `county_hunter_valuation_scenarios_select` | `manage`, same org — `county_hunter_valuation_scenarios_insert` | `manage`, same org before/after — `county_hunter_valuation_scenarios_update` | `admin`, same org — `county_hunter_valuation_scenarios_delete` |
| `county_hunter_shortlists` | `view`, same org — `county_hunter_shortlists_select` | `manage`, same org — `county_hunter_shortlists_insert` | `manage`, same org before/after — `county_hunter_shortlists_update` | `admin`, same org — `county_hunter_shortlists_delete` |
| `county_hunter_monitoring_events` | `view`, same org — `county_hunter_monitoring_events_select` | `manage`, same org — `county_hunter_monitoring_events_insert` | `manage`, same org before/after — `county_hunter_monitoring_events_update` | `admin`, same org — `county_hunter_monitoring_events_delete` |
| `county_hunter_review_tasks` | `view`, same org — `county_hunter_review_tasks_select` | `manage`, same org — `county_hunter_review_tasks_insert` | `manage`, same org before/after — `county_hunter_review_tasks_update` | `admin`, same org — `county_hunter_review_tasks_delete` |
| `county_hunter_discovery_runs` | `view`, same org — `county_hunter_discovery_runs_select` | `run_discovery`, same org — `county_hunter_discovery_runs_insert` | `run_discovery`, same org before/after — `county_hunter_discovery_runs_update` | — |
| `county_hunter_bid_assignments` | `view`, same org — `county_hunter_bid_assignments_select` | `manage`, same org, status `draft` — `county_hunter_bid_assignments_insert` | `approve_bid`, same org before/after — `county_hunter_bid_assignments_update` | — |
| `county_hunter_settings` | `view`, same org — `county_hunter_settings_select` | `admin`, same org — `county_hunter_settings_insert` | `admin`, same org before/after — `county_hunter_settings_update` | — |
| `county_hunter_audit_logs` | `view`, same org — `county_hunter_audit_logs_select` | —; only trusted database triggers/bootstrap write | — | — |
| `county_hunter_memberships` | own `user_id`, same trusted org, active — `county_hunter_memberships_select` | —; provision through trusted identity administration | — | — |

Composite `(organization_id, id)` foreign keys additionally prevent cross-tenant references even when a caller supplies valid identifiers belonging to another organization.
