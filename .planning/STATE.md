# State

## Current Project

HandlePay on Arc: USDC payments to X handles, claimed through X OAuth.

## Current Status

Project initialized as a fresh GSD project in `E:\py_scrypt\arc_project`.

## Decisions Made

- Arc is the target blockchain.
- USDC is the v1 payment asset.
- X OAuth is part of v1, not optional.
- Recipients can be unregistered at payment creation time.
- Escrow is required because recipient wallet may be unknown.
- X verification happens offchain; settlement happens onchain.
- SEO/GEO is part of the MVP surface: home metadata, robots.txt, sitemap.xml, SoftwareApplication JSON-LD, and `.planning/SEO.md`.

## Next Discussion

Clarify v1 product details:

- X API/OAuth tier and expected cost.
- Whether to resolve X user ID at send time or claim time.
- Payment expiry.
- Fee model.
- Whether `/x/handle` public pages are v1 or v2.

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
