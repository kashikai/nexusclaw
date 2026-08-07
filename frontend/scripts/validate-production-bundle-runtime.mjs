import { resolve } from 'node:path'
import { inspectProductionBundle } from './production-bundle-runtime-policy.mjs'

const staticDirectory = resolve(process.cwd(), '.next', 'static')
const result = await inspectProductionBundle(staticDirectory)
const requireMetadata = process.argv.includes('--require-metadata')
const blocked = (
  result.gates.appOwnedLocalhostRuntime ||
  result.gates.appOwnedStagingUrls ||
  (requireMetadata && !result.gates.metadataExplicit) ||
  (requireMetadata && !result.gates.metadataMatchesAppOrigin) ||
  (requireMetadata && !result.gates.siweMatchesAppOrigin) ||
  (requireMetadata && !result.gates.productionPlaceholdersRejected) ||
  !result.gates.vendorTokensDocumented
)

for (const [name, value] of Object.entries(result.gates)) {
  console.log(`${name}=${value}`)
}
console.log(
  `vendorFindingCount=${result.findings.filter((finding) => finding.category.startsWith('VENDOR_')).length}`,
)

if (blocked) {
  console.error('Production bundle runtime policy failed.')
  process.exitCode = 1
} else {
  console.log('Production bundle runtime policy passed.')
}
