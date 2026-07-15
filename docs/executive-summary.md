# HandleLayer: Executive Summary

## One-line description

HandleLayer turns a verified X identity into a route for programmable onchain actions. Its first module, Pay, lets a sender lock USDC on Arc for an X handle while the intended recipient proves that identity, connects a wallet they control, and claims from a non-custodial escrow.

## The problem

Stablecoin payments usually start with a wallet address. That breaks the social context in which many payments originate, creates copy-and-paste risk, and gives the sender no reliable proof that the supplied address belongs to the intended person.

HandleLayer tests a simpler model: address an action to a known social identity and let the verified recipient choose the receiving wallet at execution time.

## The product

The sender authenticates an X account and wallet, enters an X handle, amount, expiry, privacy settings, and cancellation policy, then approves and deposits USDC into an Arc escrow. The server resolves the recipient through X API v2 and commits an identity hash derived from the immutable X user ID.

The recipient opens a payment-specific claim link, completes fresh X OAuth, proves control of the receiving wallet with a one-time signature, and receives a short-lived authorization. The escrow releases the principal only when the authorization matches the payment, wallet, Arc chain, contract, and expiry. If the recipient never claims, the sender can cancel when allowed or refund after expiry.

## Why Arc

HandleLayer begins with a stablecoin-first consumer payment experiment. Arc provides EVM-compatible execution and a USDC-native environment that allows the Pay module to keep the payment unit, escrowed asset, fee, and user-facing value in the same currency.

The current implementation targets Arc Testnet chain ID `5042002` and testnet USDC at `0x3600000000000000000000000000000000000000`.

## What exists today

The repository contains a local, testnet-ready MVP:

- Solidity escrow with create, claim, cancel, expired refund, fee routing, pause, and two-step ownership transfer
- Arc transaction construction plus receipt, calldata, sender, and event verification
- X OAuth 2.0 Authorization Code flow with PKCE and X API v2 handle resolution
- one-time wallet ownership challenges
- PostgreSQL sessions, identity profiles, payment intents, audit logs, and indexer checkpoints
- authorization-scoped payment views that omit private values for unrelated sessions
- a polling event indexer, security headers, endpoint rate limits, deployment scripts, and automated API/security/contract tests

The escrow is deployed on Arc Testnet and RPC-verified. Explorer source verification, production X configuration, managed infrastructure, hosted end-to-end evidence, and an external security review are still required.

## Grant objective

The proposed grant funds a 16-week path from local MVP to a measurable Arc Testnet pilot and a production go/no-go package.

| Milestone | Weeks | Outcome | Proposed budget |
| --- | ---: | --- | ---: |
| 1. Public Testnet | 1-5 | Hosted product, configured X integration, verified escrow, repeatable lifecycle demo | $24,000 |
| 2. Security and Pilot | 6-11 | Independent review, remediation, closed pilot, usability and privacy evidence | $31,000 |
| 3. Production Readiness | 12-16 | Managed-key plan, monitoring, recovery, operating controls, launch assessment | $20,000 |
| **Total proposed request** | **16 weeks** |  | **$75,000** |

The amount is a submission baseline and should be adjusted to the grant program's cap, currency, and payment schedule before filing.

## Pilot targets

- at least 100 consented testers
- at least 250 funded Arc Testnet payments
- at least 80% successful claim completion among recipients who start the claim flow
- median active claim flow of five minutes or less from opening the link to transaction submission
- 100% of high/critical external-review findings remediated or explicitly accepted before production consideration
- zero unauthorized disclosure of private amount, sender, or memo in the authorization test matrix
- documented evidence for create, claim, cancel, and expired-refund paths

These are forward-looking targets, not current traction claims.

## Long-term value

If the pilot validates the interaction model, HandleLayer can extend the same verified identity route from payments into claims, access, rewards, agent permissions, and community actions. The initial Pay scope deliberately remains narrow: one identity provider, one settlement network, one stablecoin, and a clear non-custodial escrow lifecycle.

## Required submission facts

Before filing, the team must add accountable names and roles, applicant entity and jurisdiction, contact details, repository and demo URLs, deployed contract and explorer links, a demo video, license choice, and the final program-specific budget format.
