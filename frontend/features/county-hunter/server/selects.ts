export const COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT =
  '*,state:county_hunter_states!county_hunter_counties_tenant_state_fk(code,name)'

export const COUNTY_HUNTER_AUCTION_WITH_COUNTY_SELECT =
  '*,county:county_hunter_counties!county_hunter_auctions_tenant_county_fk(name,slug)'

export const COUNTY_HUNTER_PROPERTY_WITH_RELATIONS_SELECT =
  '*,county:county_hunter_counties!county_hunter_properties_tenant_county_fk(name),auction:county_hunter_auctions!county_hunter_properties_tenant_auction_fk(sale_date)'
