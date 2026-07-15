# HandlePay on Arc

## What This Is

HandlePay is an Arc-based USDC payment app for sending money to people by their X handle instead of a wallet address.

The core promise:

> Send USDC to any X handle. They claim with X.

The product is aimed at web3 users who already discover people, builders, traders, KOLs, founders, bounty hunters, and creators on X. The sender should not need to ask for a wallet address. The recipient should not need to be registered before the payment is created.

## Core Value

The sender targets a verified X identity instead of collecting a wallet address, while Arc escrow keeps the principal recoverable until the intended recipient proves both the X account and a destination wallet.

## Requirements

The tracked v1 requirements and their current implementation status live in `REQUIREMENTS.md`. Checked requirements mean repository implementation and automated evidence exist; public Arc deployment and real X/wallet acceptance testing remain explicit release gates.

## Why This Exists

Web3 coordination happens on X, but payments still fall back to wallet addresses, DMs, manual copy/paste, or centralized tools. That creates friction and mistakes:

- Senders do not always know the recipient wallet.
- Recipients may not be onboarded yet.
- Long addresses are easy to copy incorrectly.
- Tips, bounties, rewards, and small paid work are awkward to settle.
- Existing social payment flows often depend on another chain, custodial rails, or generic payment links without X-native identity.

HandlePay uses X identity for discovery and Arc for USDC settlement.

## Product Shape

### Primary Flow

1. Sender enters an X handle, for example `@alice`.
2. App resolves and displays the target identity.
3. Sender creates a USDC payment on Arc.
4. Funds move into an Arc escrow contract.
5. Recipient opens the claim page.
6. Recipient connects wallet and signs in with X OAuth.
7. Backend verifies X ownership and signs a claim authorization.
8. Recipient claims USDC from escrow to their wallet.
9. If unclaimed after expiry, sender can refund.

### Viral Loop

After funding, the app generates share text:

`@alice you have 25 USDC waiting on Arc. Claim with X.`

The recipient arrives because they were mentioned or sent the claim page. After claiming, they can send to another X handle.

## SEO / GEO Positioning

Primary search promise:

> Send USDC to any X handle. They claim with X.

HandlePay should target searches around X-native stablecoin payments, USDC tips, crypto payment links, Arc payments, and Web3 creator payments. The SEO plan lives in `.planning/SEO.md` and should stay aligned with the product truth: X OAuth proves social identity, Arc settles USDC, and recipients do not need to be registered before a payment is created.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Use Arc as settlement chain | Arc is stablecoin-native, EVM-compatible, and designed for USDC payments. | Accepted |
| Use USDC as payment asset | Stablecoin UX is clearer than volatile native tokens. | Accepted |
| Use X OAuth in v1 | The core product is paying people where web3 already lives: X. | Accepted |
| Support unregistered recipients | This is the growth loop: recipients can join later and claim. | Accepted |
| Use escrow for handle payments | Direct transfer cannot work when recipient wallet is unknown. | Accepted |
| Verify X offchain, settle onchain | Contracts cannot verify X OAuth directly. Backend verifier signs claim authorization. | Accepted |
| Treat X API cost as product cost | X identity is central, not optional. | Accepted |

## Architecture Hypothesis

### Onchain

- `HandlePaymentEscrow`
  - creates payment intents to X identities
  - holds USDC
  - allows claim with verifier signature
  - allows refund after expiry
  - emits events for indexer/history

- `VerifierRegistry` or role inside escrow
  - trusted verifier signer
  - signer rotation
  - pause/revoke path

### Backend

- X OAuth app integration
- X identity verification
- payment metadata and status API
- event indexer
- claim authorization signer
- anti-abuse and rate limits

### Frontend

- send to X handle page
- public claim page
- payment status page
- wallet connect
- X sign-in
- sent/received history

## Privacy Model

This is not full cryptographic privacy.

V1 privacy posture:

- Sender pays to an X identity/payment intent, not a known wallet address.
- Recipient wallet appears only at claim time.
- Optional memo/message should be offchain and not emitted onchain.
- Amount and escrow events are public on Arc.

Future privacy can add encrypted memo, pooled settlement, or zero-knowledge/TEE providers if needed.

## Out Of Scope For V1

- Solana or MagicBlock PER implementation
- Full anonymous payments
- X bot automation as the only UX
- Mainnet launch before Arc testnet proof
- Custodial recipient wallets
- Multi-chain routing before Arc flow works
- Agent wallet and SaaS checkout modules

## Open Questions

- What exact X OAuth/API tier is acceptable for MVP?
- Should payment creation resolve X immutable user ID immediately, or store handle first and verify at claim?
- What default expiry should payments use: 7, 14, or 30 days?
- Should senders pay a platform fee, a flat fee, or no fee in MVP?
- Should the app support public tipping pages like `/x/alice` in v1?
- Should claims require wallet signature before X OAuth, after X OAuth, or both?

---
*Last updated: 2026-07-15 after implementation-status reconciliation*
