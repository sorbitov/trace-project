# HandlePay on Arc

Send USDC to any X handle. They claim with X.

This repository currently contains a first MVP prototype for the v1 product flow:

- server-backed local app state
- send a tip to an X handle
- escrow-style payment settings
- public/private amount and sender visibility
- private memo after X OAuth
- generated X mention copy
- claim flow: X OAuth -> connect wallet -> claim
- main page before entering the dapp
- sender/recipient dashboard mock
- Solidity escrow contract skeleton for Arc USDC settlement

## Open Prototype

Run the local app server:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4174/index.html
```

## Project Docs

GSD artifacts live in `.planning/`.

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/01-product-definition/01-CONTEXT.md`

## Local In This Version

- X lookup and OAuth are represented by local verifier API routes.
- Wallet connection is represented by entering an Arc EVM address.
- Arc transaction sending is represented by server-backed payment state.
- Dashboard/history persist to `data/state.json`.

## Real Next Pieces

- X OAuth backend
- Arc Testnet deployment
- USDC escrow integration
- event indexer and profile storage
