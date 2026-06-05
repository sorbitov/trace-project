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

## Mocked Prototype

The app in `app/` uses localStorage and mock buttons for:

- X lookup
- X OAuth
- wallet connection
- claim transaction
- history indexing

## Contract Skeleton

`contracts/HandlePaymentEscrow.sol` contains the first escrow shape:

- create payment
- claim with verifier signature
- sender-only refund after expiry
- sender-only cancel if cancellable
- verifier rotation
- pause switch

The contract intentionally does not verify X directly. X identity is verified by backend, then represented onchain through verifier signatures.
