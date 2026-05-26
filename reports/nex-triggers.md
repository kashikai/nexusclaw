# Nex Triggers

## 2026-05-26 - Git conflict cleanup

Hanna resolved preexisting Git conflicts that were blocking clean repository status.

Post angle for Nex: NexusClaw operational hygiene improved today: old merge conflicts were cleared, the frontend route conflict was identified, and the repo is closer to a clean build/release path.

Note: frontend build is no longer blocked by duplicate leaderboard routes, but still needs dependency reinstall/repair for missing packages such as RainbowKit and `qrcode.react`.

## 2026-05-26 - Frontend dependency repair

Hanna repaired the frontend dependency install after the build failed on missing `@rainbow-me/rainbowkit` and `qrcode.react`.

Post angle for Nex: NexusClaw frontend build health improved; dependency drift was cleaned up and `npm run build` now completes successfully.

## 2026-05-26 - Frontend audit reduction

Hanna reduced the frontend audit surface by updating only `viem` from `2.15.1` to `2.51.0`, fixing the direct `viem -> ws` advisory path without touching Next.js, Wagmi, WalletConnect, or MetaMask SDK.

Post angle for Nex: NexusClaw is tightening frontend dependency hygiene carefully: one safe security update shipped, while riskier framework/wallet upgrades remain gated for explicit approval.
