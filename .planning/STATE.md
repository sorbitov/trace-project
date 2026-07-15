# State

## Current Project

HandlePay on Arc: USDC payments to X handles, claimed through X OAuth.

## Current Status

Local MVP implementation is complete through Phase 3. Phase 4 is active: the escrow is deployed on Arc Testnet and RPC-verified; explorer source verification and lifecycle evidence remain pending. Phase 5 launch evidence remains pending.

Implementation update (2026-07-14):

- Local JSON payment mutations were replaced by PostgreSQL-backed sessions, profiles, payment intents, audit logs, and indexer checkpoints.
- Wallet ownership now uses a signed one-time challenge; X identity uses OAuth 2.0 PKCE.
- Recipient lookup uses the immutable X API user ID and fails closed when X credentials are absent.
- Frontend now submits Arc USDC approval and escrow transactions through the injected wallet.
- Funding and settlement are accepted only after matching Arc receipts and escrow events.
- Claim links select the exact `#claim=<id>` payment and private API fields are viewer-scoped.
- Hardened escrow contract, Hardhat build, deploy script, event indexer, rate limits, security headers, and automated tests are present.
- PostgreSQL migration and local HTTP integration checks pass; 37 automated tests pass and `npm audit` reports zero vulnerabilities.
- X OAuth client configuration is present, but immutable recipient lookup still needs `X_BEARER_TOKEN` and real two-account acceptance testing.
- `HandlePaymentEscrow` deployed at `0x5A3949aE67a37e7e37bFC77F5b7832Cc93f40A2a` in block `51929589`; onchain code and configuration were verified through Arc RPC.
- Live low-value lifecycle smoke passed for create/claim, create/cancel, and create/expired-refund (payment IDs 1–3); transaction hashes are recorded in the deployment manifest.
- Arcscan source submission timed out while the explorer API had not indexed the fresh deployment; retry remains pending.

GSD phases were reorganized:

- Phase 1: idea and product definition.
- Phase 2: current dapp prototype and everything already built.
- Phase 3: SEO/GEO.
- Phase 4: smart contracts and Arc Testnet.
- Phase 5: backend, integrations, and testnet launch loop.

## Decisions Made

- Arc is the target blockchain.
- USDC is the v1 payment asset.
- X OAuth is part of v1, not optional.
- Recipients can be unregistered at payment creation time.
- Escrow is required because recipient wallet may be unknown.
- X verification happens offchain; settlement happens onchain.
- SEO/GEO is part of the MVP surface: home metadata, robots.txt, sitemap.xml, SoftwareApplication JSON-LD, and `.planning/SEO.md`.

## Current Position

- Current phase: 4 — Smart Contracts and Arc Testnet.
- Completed locally: phases 1–3.
- Active plan: complete Arcscan source verification and package the verified lifecycle evidence.
- Blockers: Arcscan indexing, a separate verifier/role configuration, funded sender/recipient wallets, hosting account, and PostgreSQL deployment.

## Next Discussion

Next work should be added under the correct phase subsection:

- product idea/rules -> Phase 1
- current prototype/UI/API behavior -> Phase 2
- SEO/GEO/content/discoverability -> Phase 3
- Solidity/contracts/Arc Testnet deployment -> Phase 4
- real backend, integrations, indexer, launch ops -> Phase 5

## Recent Notes

The previous Predict402 context was incorrect for this project. This project is separate and lives in `E:\py_scrypt\arc_project`.

Current prototype status:

- Home page opens first.
- Dapp opens from the home page.
- Send, Claim, History, and Profile views exist.
- Profile registration is a modal inside the dapp.
- Registration can start from wallet or X; one connected identity is enough to enter the dapp.
- Sending is gated until the active profile has both wallet and X linked.
- Profile settings show wallet/X linking status and let the user connect the missing identity later.
- Saved X links are restored from the persisted profile, so returning users are not forced through X OAuth again just to enter the dapp.
- Local API persists sessions, profiles, payments, audit logs, and indexer checkpoints in PostgreSQL.
- Server runs on `http://127.0.0.1:4174/index.html`.
