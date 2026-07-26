# Implementation Notes

## End-to-end flow

1. Sender signs a one-time wallet challenge and completes X OAuth.
2. Backend resolves the recipient handle through X API v2 and stores the immutable X user ID.
3. Backend creates a PostgreSQL payment intent and returns encoded USDC `approve` and escrow `createPayment` calls.
4. Sender submits both transactions through the injected wallet on Arc Testnet.
5. Backend verifies the transaction sender, configured chain, escrow address, amount, identity hash, fee, expiry, cancellation mode, and `PaymentCreated` event.
6. Recipient opens `#claim=<payment-id>`; the frontend loads that exact payment.
7. Recipient completes fresh X OAuth and proves control of the claiming wallet.
8. Backend signs a ten-minute claim authorization bound to payment, wallet, chain, contract, and expiry.
9. Recipient submits the claim transaction. The API and indexer verify the settlement event.

## Storage

`data/state.json` is no longer read by the application. PostgreSQL stores profiles, sessions, OAuth states, wallet challenges, payment intents, audit records, and indexer checkpoints. The migration is idempotent and lives in `migrations/001_initial.sql`.

## Contract behavior

`HandlePaymentEscrow` escrows the principal and sends the mandatory protocol fee to the treasury at creation. Cancellation or expiry returns the principal; the already-routed protocol fee is not refunded. Create and claim stop during an emergency pause, while cancel and refund remain available.

## External boundaries

The application deliberately fails closed when any required production integration is absent:

- no `X_BEARER_TOKEN`: recipient lookup returns 503
- no X client ID: OAuth start returns 503
- no escrow address: payment intent creation returns 503
- no verifier key: claim authorization returns 503
- wrong Arc RPC chain: receipt verification and claim authorization return 503
