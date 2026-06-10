# State

## Current Project

HandlePay on Arc: USDC payments to X handles, claimed through X OAuth.

## Current Status

Project initialized as a fresh GSD project in `E:\py_scrypt\arc_project`.

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
- Send, Claim, Dashboard, and Profile views exist.
- Profile registration is a modal inside the dapp.
- Registration flow is X OAuth first, wallet connection second, profile creation third.
- Sending is gated until profile creation.
- Local API persists dashboard and payments in `data/state.json`.
- Server runs on `http://127.0.0.1:4174/index.html`.
