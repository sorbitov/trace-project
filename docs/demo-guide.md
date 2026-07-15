# PACT Reviewer Demo and Evidence Guide

## Demo objective

Prove that PACT performs a real Arc Testnet escrow lifecycle, binds claim authorization to the intended X recipient and wallet, protects role-scoped metadata, and fails closed when required integrations are unavailable.

## Environment requirements

- Node.js 22 or newer
- Docker Desktop and PostgreSQL migration access
- two X test identities controlled by the reviewer/team
- two EVM wallets configured for Arc Testnet
- Arc Testnet USDC and native gas balance for the sender
- X OAuth client ID, optional confidential-client secret, and bearer token
- deployed escrow address/block plus verifier, owner, and treasury roles

Never use production-value funds for the grant demo.

## Pre-demo verification

```powershell
npm install
npm run db:up
npm run db:migrate
npm test
npm audit
npm run check
```

Record the command output, current commit/tag, Node version, deployment manifest, and environment name. Do not record environment secret values.

Start services:

```powershell
npm start
npm run indexer
```

Check:

- `GET /api/health` returns database ready and all required integration flags true
- `/api/config` contains the expected Arc chain, USDC, escrow, and explorer values but no private key
- the indexer starts from the configured deployment block or durable checkpoint
- the deployed contract's verifier, owner, treasury, USDC, and minimum fee match the manifest

## Reviewer walkthrough

### 1. Sender identity

1. Open a clean browser session.
2. Connect sender wallet A and complete the one-time wallet signature.
3. Complete X OAuth as sender identity A.
4. Confirm the interface shows the expected handle and shortened wallet.

Evidence: OAuth success without token exposure, wallet verification audit event, and profile state. Never include raw session/OAuth tokens in screenshots.

### 2. Create and fund

1. Enter recipient handle B, 1.00 USDC, short expiry, private amount/memo, and cancellable mode.
2. Create the payment intent.
3. In wallet A, submit USDC approval and escrow creation.
4. Provide the funding transaction hash to the API when prompted.
5. Confirm the payment changes from `awaiting_funding` to `pending` only after verification.

Evidence:

- intent ID and exact claim link
- Arc explorer funding transaction
- `PaymentCreated` event and USDC transfer
- API state with matching on-chain payment ID
- no fake pending record when the transaction is rejected or reverted

### 3. Verify privacy boundary

1. Open the payment from an unrelated clean session.
2. Inspect the API response and interface.
3. Confirm private amount, sender, and memo values are omitted, not only covered by CSS.

Evidence: redacted response sample and authorization test result.

### 4. Recipient claim

1. Open the exact `#claim=<payment-id>` link in a clean recipient session.
2. Confirm that the referenced payment loads rather than the first dashboard record.
3. Complete fresh X OAuth as recipient identity B.
4. Connect and prove wallet B.
5. Request claim authorization and show its short expiry and payment/wallet context.
6. Submit `claim` from wallet B.
7. Confirm the Arc explorer shows `Claimed` and USDC transferred to wallet B.
8. Confirm API/indexer lifecycle becomes `claimed`.

Evidence: claim transaction, event, recipient transfer, audit request IDs, and final state.

### 5. Cancellation

Create a second cancellable payment. Show that only sender wallet/session A can request and submit cancellation, then verify `Cancelled` and principal return on Arc.

### 6. Expired refund

Create a short-expiry payment or use a controlled test fixture. After contract expiry, show the API projection as expired, submit refund from the sender, and verify `Refunded` plus principal return.

### 7. Locked payment

Create a locked payment and demonstrate that cancellation is rejected while post-expiry refund remains possible.

## Required negative cases

| Case | Expected result |
| --- | --- |
| X integration missing | Explicit configuration error; no fake identity/payment |
| Escrow address missing | Payment creation unavailable |
| Verifier key missing | Claim authorization unavailable |
| Wrong Arc chain | Transaction or verification rejected |
| Wrong X recipient | Claim authorization rejected |
| Stale recipient OAuth | Fresh OAuth required |
| Unproven/different wallet | Claim authorization rejected |
| Replayed wallet challenge | Rejected as used/expired |
| Replayed claim signature | Rejected by contract |
| Reverted or unrelated tx hash | Funding/settlement state unchanged |
| Expired claim authorization | Claim rejected |
| Unrelated API session | Private fields omitted and mutations denied |
| Paused contract | Create/claim blocked; cancel/refund still available |
| Indexer restart | Resumes from checkpoint and reconciles events |

## Evidence package structure

```text
evidence/
  00-release-and-test-output/
  01-deployment-manifest/
  02-create-and-fund/
  03-privacy-authorization/
  04-claim/
  05-cancel/
  06-expired-refund/
  07-negative-cases/
  08-runbooks-and-monitoring/
  acceptance-checklist.md
```

For every transaction, include network, timestamp, transaction hash, explorer URL, expected event, observed event, payment ID, and reviewer result. Redact secrets and avoid publishing raw IP, session tokens, OAuth tokens, or private memo content.

## Five-minute demo video outline

- 0:00-0:30: problem, product, and truth boundary
- 0:30-1:10: architecture and deployed contract evidence
- 1:10-2:20: sender identity, payment creation, and verified funding
- 2:20-3:30: exact claim link, recipient OAuth/wallet proof, and claim
- 3:30-4:10: privacy response and wrong-account failure
- 4:10-4:40: cancellation/refund and pause safety
- 4:40-5:00: tests, pilot goals, contract/repository links, grant ask

## Reviewer sign-off

The acceptance record should name the reviewer, date, release tag, deployed address, tested wallets/X identities (redacted as appropriate), passed/failed cases, unresolved defects, and whether the milestone is accepted, conditionally accepted, or rejected.
