# HandlePay on Arc

Send USDC to any X handle. They claim with X.

This repository currently contains a first MVP prototype for the v1 product flow:

- send a tip to an X handle
- escrow-style payment settings
- public/private amount and sender visibility
- private memo after X OAuth
- generated X mention copy
- claim flow: X OAuth -> connect wallet -> claim
- sender/recipient dashboard mock
- Solidity escrow contract skeleton for Arc USDC settlement

## Open Prototype

Open this file in a browser:

```text
app/index.html
```

No local server is required for the current prototype.

## Project Docs

GSD artifacts live in `.planning/`.

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/01-product-definition/01-CONTEXT.md`

## Mocked In This Version

- X lookup and OAuth
- wallet connection
- Arc transaction sending
- dashboard indexing

## Real Next Pieces

- X OAuth backend
- Arc Testnet deployment
- USDC escrow integration
- event indexer and profile storage
