# Implementation Notes

## What Was Borrowed From Open Source Research

No repository was copied directly.

Patterns used:

- `dapplets/tipping-dapplet`: social-account tipping, claim-later UX, and the idea that tips can accrue before account binding.
- `CryptoPayLink`: payment-link/dashboard mental model.
- `PayCircle`: minimal EVM escrow/link structure.

## V1 Flow

1. Sender enters an X handle.
2. Backend resolves the handle to an immutable X user ID.
3. Sender funds an Arc USDC escrow payment.
4. App generates X mention copy.
5. Recipient opens claim page.
6. Recipient completes X OAuth.
7. Recipient connects wallet.
8. Backend signs claim authorization.
9. Recipient claims from escrow.

## Local App Server

The app is served by `server.js` and stores runtime state in `data/state.json`.

Current API routes:

- `GET /api/state`
- `POST /api/dashboard`
- `POST /api/payments`
- `POST /api/payments/:id/verify-x`
- `POST /api/payments/:id/claim`
- `POST /api/payments/:id/cancel`

The app no longer depends on demo seed buttons or browser-only localStorage state.

## Integration Boundary

Local server routes preserve the production shape, but external integrations still need real providers:

- X OAuth app and API lookup for immutable X user IDs
- wallet connector for the connected Arc EVM address
- Arc USDC escrow transaction creation and event indexing
- backend verifier signatures for onchain claim authorization

## Contract Skeleton

`contracts/HandlePaymentEscrow.sol` contains the first escrow shape:

- create payment
- claim with verifier signature
- sender-only refund after expiry
- sender-only cancel if cancellable
- verifier rotation
- pause switch

The contract intentionally does not verify X directly. X identity is verified by backend, then represented onchain through verifier signatures.
