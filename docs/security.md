# HandleLayer Security Model

Updated: 14 July 2026

This document describes implemented controls, assumptions, and residual risks. It is not an independent audit, certification, or guarantee of safety.

## Security objectives

1. Only a freshly authenticated intended X recipient can obtain authorization for a claim wallet they control.
2. Payment principal moves only through the deployed Arc escrow lifecycle.
3. The API never records funded or settled success without matching verified chain evidence.
4. A sender can recover eligible principal after cancellation or expiry, including while the contract is paused.
5. Unrelated API sessions do not receive private amount, sender, or memo fields.
6. Administrative, verifier, deployer, and treasury capabilities are separated and observable.

## Assets and security owners

| Asset | Primary protection | Required production owner |
| --- | --- | --- |
| Escrowed USDC principal | Contract invariants and verified lifecycle | Protocol/contract owner |
| Verifier key | Isolated signing, short-lived context-bound digests | Security/operations owner |
| Contract owner authority | Two-step ownership, hardware/multisig target | Governance owner |
| Treasury | Separate address and event monitoring | Finance/treasury owner |
| X identity binding | OAuth PKCE, state, immutable user ID | Identity integration owner |
| Wallet binding | One-time signed challenge | Application security owner |
| Sessions and OAuth state | Hashed tokens, expiry, HttpOnly cookie | Backend owner |
| Private API fields | Viewer-scoped response shaping | Backend/privacy owner |
| Database lifecycle | Receipt/event verification and indexer reconciliation | Data/operations owner |
| Audit evidence | Append-only records, restricted access/retention | Security owner |

Named individuals must be assigned before a public-value launch.

## Threat and control matrix

| Threat | Severity | Implemented control | Residual risk / next control |
| --- | --- | --- | --- |
| Fake handle-to-user mapping | High | Server X API v2 lookup; immutable X user ID stored; identity hash committed | X platform/account integrity; monitor lookup failures and policy changes |
| Wrong X account claims | Critical | Fresh OAuth session must match stored recipient ID | Compromised X account may authenticate; communicate social-account risk |
| Claim to an unowned wallet | Critical | One-time, expiring challenge signed by expected wallet | Compromised wallet remains out of scope; test hardware/mobile wallets |
| Replayed/cross-context authorization | Critical | Digest binds payment, wallet, chain, contract and expiry; used digest recorded | Verifier compromise can sign new digests; use managed signer and alerts |
| Fake funded state | Critical | Successful Arc receipt, expected sender/contract/calldata, and matching event required | RPC correctness/availability; add provider redundancy and reorg policy |
| Fake settlement state | High | Settlement receipt and lifecycle event verified; indexer reconciles | Delayed/stale projection; monitor lag and support replay |
| Contract reentrancy/token failure | Critical | Non-reentrancy, checked low-level ERC-20 calls, checks-effects-interactions | External review required; USDC behavior is an external assumption |
| Stuck funds under pause | High | Pause blocks create/claim but leaves cancel and expired refund available | Owner governance remains powerful; monitor and document pause use |
| Unauthorized API disclosure | High | Viewer-scoped projection omits private values | Regression risk; full endpoint/role matrix and continuous tests needed |
| OAuth CSRF or redirect abuse | High | PKCE, server-stored one-time state, session binding, safe return path | Production X callback and proxy configuration must remain exact |
| Challenge replay | High | Hashed nonce, expected wallet/session, expiry, one-time consumption | Database availability is required for challenge integrity |
| Session theft | High | HttpOnly, SameSite=Lax, server-side session, secure cookie in production | HTTPS, device/browser compromise, and session revocation remain concerns |
| API abuse/brute force | Medium | Auth and payment route rate limits, body limit, audit trail | Multi-replica deployment needs shared limiter and upstream protection |
| Secret leakage | Critical | Environment configuration; secrets excluded from public API and repository | Managed secrets, rotation, CI scanning, least-privilege access required |
| Database tampering | High | Chain remains settlement authority; event reconciliation and audits | Compromised DB can affect availability/privacy; access controls and backups |
| Indexer rollback/reorg error | High | Durable checkpoint and chain event parsing | Explicit confirmation/reorg recovery policy required before production |
| Frontend supply-chain attack | Critical | CSP and locked dependencies | Add CI scanning, release integrity, dependency/update policy |

## Contract controls

- nonzero constructor and administrative update addresses
- principal and fee transferred from sender at creation
- minimum fee enforced and total fee capped at 10%
- payment existence, pending status, and sender checks
- payment expiry and claim-authorization expiry checks
- claim digest scoped to chain and contract
- low-s ECDSA and normalized recovery ID
- used digest replay protection
- state changes before external token transfer
- non-reentrancy guard
- two-step ownership transfer
- create/claim pause while cancellation and expired refund remain available

Contract assumptions:

- configured USDC address is the intended token and follows expected ERC-20 behavior
- verifier signs only after backend policy succeeds
- owner and verifier roles are not compromised together
- Arc chain ID and deployment address are configured consistently across client, API, signer, and explorer evidence

## Backend and identity controls

- OAuth Authorization Code with PKCE and one-time state records
- OAuth state bound to the same server session that initiated it
- return paths constrained to local application paths
- recipient matched by immutable X user ID, not handle text
- claim requires recent X verification (currently within 30 minutes)
- wallet challenge expires after five minutes and is consumed once
- wallet signature is recovered and compared with the expected checksummed address
- claim authorization expires after a short window and matches the session-linked wallet
- sessions use random raw tokens but store only token hashes server-side
- sensitive mutations write audit events with request IDs and keyed IP hashes

## Chain evidence controls

The backend treats client transaction hashes as references, not assertions. Funding verification compares receipt status, chain, sender, destination, decoded inputs, stored payment terms, and `PaymentCreated` event. Settlement verification checks the expected payment and event outcome before updating the database.

Before production, define:

- minimum confirmation/finality policy
- behavior under short reorgs
- primary/fallback RPC disagreement handling
- maximum acceptable indexer lag
- replay window from deployment block
- escalation when chain and database lifecycle diverge

## Privacy model

Privacy is authorization-based, not visual. For unrelated sessions, API responses omit private amount, sender, and memo values. The browser cannot reveal a value it never receives.

The following remain public or inferable on a public blockchain:

- sender wallet and contract interaction
- token transfer amounts and timing
- escrow contract and payment identifiers
- recipient wallet after claim
- transaction graph and gas activity

Product copy must say “private in HandleLayer views” rather than “private on-chain.” Memo text is stored off-chain and should never contain secrets, credentials, regulated data, or highly sensitive personal information.

## Key management plan

### Testnet

- separate deployer, owner, verifier, and treasury addresses
- environment secrets only on controlled hosts
- low-value funded accounts
- event alerts for owner, verifier, treasury, fee, and pause changes

### Required before mainnet

1. Move verifier signing to a managed signer or KMS-compatible service.
2. Move owner authority to hardware-backed multisig governance.
3. Remove deployer credentials from long-running application hosts.
4. Document key generation, custody, access approval, rotation, revocation, backup, and destruction.
5. Alert on every administrative event and anomalous signing volume.
6. Perform a verifier rotation and emergency revocation exercise in staging.

## Authorization test matrix

The pre-pilot test suite must cover at least:

| Actor/session | Public payment fields | Private amount/sender/memo | Fund confirmation | Claim authorization | Cancel/refund |
| --- | --- | --- | --- | --- | --- |
| Unrelated session | Public fields only | Denied/omitted | Denied | Denied | Denied |
| Authenticated sender | Allowed | Allowed | Allowed for own payment | Denied unless also intended recipient | Allowed when contract rules permit |
| Intended recipient, stale X auth | Limited view | Per configured recipient policy | Denied | Denied pending fresh OAuth | Denied |
| Intended recipient, fresh X, wrong wallet | Allowed | Allowed | Denied | Denied | Denied |
| Intended recipient, fresh X, proven wallet | Allowed | Allowed | Denied | Allowed while pending/unexpired | Denied |
| Expired/cancelled/claimed payment | State view | Role-scoped | Denied | Denied | Only valid remaining transition |

Every API endpoint must be tested against every relevant actor, not only happy-path screens.

## Monitoring and incident signals

Alert on:

- verifier signing spikes or repeated rejected authorizations
- owner/verifier/treasury/fee/pause events
- receipt or event verification mismatch
- database-to-chain lifecycle divergence
- indexer lag above target
- OAuth callback/state failure spikes
- rate-limit spikes and repeated wallet challenge failures
- backup or restore failure
- unexpected production configuration change

Each alert needs severity, primary and backup responder, response-time objective, evidence location, containment step, and closure criteria.

## Pre-production exit criteria

- independent Solidity and backend authorization review complete
- all critical/high findings fixed and retested or formally accepted
- full role/endpoint/privacy matrix passes
- backup restore, indexer replay, key rotation, RPC failure, X outage, and pause/refund exercises pass
- production CSP/TLS/cookie/proxy configuration reviewed
- shared multi-replica rate limiting and sessions implemented or deployment held to one replica
- security contact, disclosure policy, incident owner, and retention policy published
- legal/privacy review confirms acceptable data handling and launch scope

## Disclosure policy fields

`TEAM INPUT REQUIRED`: security contact email, acknowledgement window, remediation targets by severity, safe-harbor language, out-of-scope systems, encryption key for reports if used, and bounty eligibility if offered.
