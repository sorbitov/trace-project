# Phase 4 Context: Smart Contracts and Arc Testnet

## Scope

Phase 4 starts when we build the real Arc USDC escrow contracts and connect them to the app.

## Contract Targets

- `HandlePaymentEscrow`
- USDC payment intent creation.
- Claim with verifier signature.
- Sender refund/cancel path.
- Expiry handling.
- Verifier signer rotation.
- Pause/emergency control.
- Events for payment indexing.

## Required Security Tests

- Replay protection.
- Wrong wallet rejection.
- Wrong chain rejection.
- Expired signature rejection.
- Unauthorized verifier rejection.
- Refund/cancel rules.
- Pause behavior.

## Add Future Phase 4 Work Here

Use this phase for Solidity, deployment scripts, Arc Testnet configuration, contract tests, verifier signature formats, and onchain/frontend integration.
