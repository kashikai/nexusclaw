export function isCountyHunterServerEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment.COUNTY_HUNTER_ENABLED === 'true'
}
