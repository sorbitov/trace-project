# HandleLayer Grant Application

Status: complete submission draft based on the current repository. Fields marked `TEAM INPUT REQUIRED` must be replaced with accountable facts before filing.

## Application snapshot

| Field | Proposed answer |
| --- | --- |
| Project | HandleLayer on Arc |
| Category | Consumer payments / stablecoin infrastructure / identity-addressed escrow |
| Stage | Local testnet-ready MVP; public deployment pending |
| Network and asset | Arc Testnet and USDC |
| Proposed duration | 16 weeks |
| Proposed request | USD 75,000 |
| Primary outcome | Public Arc Testnet pilot plus production go/no-go package |
| Current repository version | 0.1.0 |

The proposed amount is a planning baseline. It must be reconciled with the selected program's cap, eligible costs, currency, tax treatment, and payment schedule.

## Short descriptions

### 50 words

HandleLayer turns a verified X identity into a reusable route for onchain actions. Its first module, Pay, lets a sender address Arc USDC to an X handle instead of requesting a wallet address. USDC is held in a non-custodial escrow; the verified recipient connects a wallet and claims.

### 150 words

HandleLayer is an identity-addressed action layer built for Arc, beginning with a USDC payment protocol. A sender enters an X handle, payment terms, and privacy settings, then deposits USDC into an on-chain escrow. The backend resolves the handle to an immutable X user ID through X API v2 and commits only an identity hash to the contract. The recipient opens a payment-specific link, completes fresh X OAuth, proves control of a receiving wallet with a signed challenge, and receives a short-lived authorization bound to the payment, wallet, chain, contract, and expiry. The escrow then releases principal to that wallet. If a payment is not claimed, the sender can cancel when permitted or refund after expiry. The repository contains the contract, Arc transaction and receipt verification, OAuth and wallet authentication, PostgreSQL persistence, scoped privacy controls, an indexer, audit logs, rate limits, deployment tooling, and automated tests. The same verified identity route can later support claims, access, rewards, and agent permissions without changing the custody boundary. Grant funding would support public testnet deployment, independent review, a measured pilot, and production-readiness work.

## Problem and opportunity

Stablecoin transfers are technically direct but socially awkward. The sender usually has to leave the original conversation, request a wallet address, copy or scan it, choose the correct network, and trust that the address belongs to the intended person. A typo, stale address, compromised message, or network mismatch can create an irreversible loss.

The opportunity is not to replace wallets. It is to let a familiar, verifiable identity act as the payment address while the recipient retains control of the final wallet. This can shorten the path between social intent and on-chain settlement for creator rewards, reimbursements, community payments, and peer-to-peer transfers.

The grant pilot will test this hypothesis rather than assume it: does entering a known handle improve completion, attribution confidence, and comprehension compared with requesting a wallet address?

## Solution

HandleLayer separates identity authorization from asset custody:

1. The sender proves control of an X account and wallet.
2. The sender enters an X handle, amount, expiry, memo, visibility, and cancellation policy.
3. The API resolves the handle through X API v2 and stores the immutable X user ID.
4. The browser asks the sender's wallet to approve USDC and call `createPayment` on Arc.
5. The backend marks the payment funded only after it verifies the Arc receipt, sender, contract, calldata, and matching `PaymentCreated` event.
6. The recipient opens `#claim=<payment-id>`, completes fresh X OAuth, and proves the claim wallet through a one-time signature.
7. The backend issues a ten-minute claim authorization bound to the payment ID, wallet, Arc chain ID, escrow address, and authorization expiry.
8. The recipient submits `claim`; the contract verifies the signature and transfers principal.
9. Unclaimed funds remain recoverable by the sender through permitted cancellation or post-expiry refund.

HandleLayer does not create a custodial user balance, invent a recipient wallet, or mark mock state as paid when integrations are missing.

## Why Arc

The HandleLayer Pay module is designed around a stablecoin-denominated user experience. Arc provides EVM-compatible contract execution in a USDC-native environment, allowing the payment unit, escrowed principal, protocol fee, and user-facing amount to stay denominated in the same currency.

The implementation currently targets:

- chain ID `5042002`
- RPC `https://rpc.testnet.arc.network`
- explorer `https://testnet.arcscan.app`
- testnet USDC `0x3600000000000000000000000000000000000000`

The backend checks chain context before accepting funding evidence or producing claim authorizations. Arc is therefore part of the security context, not just a configurable label in the interface.

## Current implementation and proof

| Area | Implemented today | Evidence |
| --- | --- | --- |
| Escrow | Create, claim, cancel, expired refund, fee routing, pause, two-step ownership | `contracts/HandlePaymentEscrow.sol` and contract tests |
| Claim security | Payment/wallet/chain/contract/expiry binding, low-s signatures, replay protection | contract code and signature tests |
| Chain integration | Wallet network switch, USDC approval, escrow calls, receipt/calldata/event validation | `app/app.js`, `src/chain.js` |
| X identity | OAuth 2.0 PKCE, state validation, authenticated-user lookup, immutable recipient lookup | `src/x-client.js`, API routes and tests |
| Wallet identity | Five-minute one-time challenge and signature recovery | `src/security.js` and security tests |
| Persistence | PostgreSQL profiles, sessions, OAuth states, challenges, payments, audits, indexer state | migration and database module |
| Privacy | Amount/sender/memo omitted for unauthorized sessions | viewer-scoped API response shaping |
| Operations | Health endpoint, audit trail, rate limits, Helmet/CSP, polling indexer | server and indexer code |
| Quality | API, security, and Solidity automated tests; dependency lockfile | `npm test`, `npm audit`, `npm run check` |

Current verification result: 14 automated tests pass across API, security, and contract behavior. A public CI URL must be added after the repository is published.

## Current limitations

The following are not presented as completed:

- no public Arc Testnet deployment or explorer-verified contract yet
- no production X application credentials in the repository
- no public hosted demo URL or pilot traffic
- no independent security review
- no managed signer/KMS or multi-replica rate-limit store
- no final applicant entity, team biographies, license, or public repository URL

The application fails closed when X, chain, escrow, or verifier configuration is absent. That is intentional and avoids fake success paths.

## Differentiation

HandleLayer combines four properties that are often separated:

1. **Human-readable addressing:** the sender enters a known X handle.
2. **Immutable identity binding:** the system resolves and stores the X user ID so a later handle change does not silently redirect the payment.
3. **Recipient wallet choice:** the recipient proves the receiving wallet at claim time; HandleLayer does not assign or custody a wallet.
4. **On-chain recovery rules:** principal remains in a transparent escrow with enforceable claim, cancel, and expiry behavior.

The design also distinguishes API metadata privacy from blockchain privacy. Private memo, sender label, and amount are withheld from unrelated API sessions, but the product does not claim that public blockchain activity is confidential.

## Milestones and acceptance

### M1 — Public Arc Testnet, weeks 1-5, $24,000

Deliver a hosted HTTPS application, configured X integration, deployed and explorer-verified escrow, public deployment manifest, operator runbooks, and a repeatable reviewer demo.

Acceptance:

- all required dependencies report ready through the health endpoint
- a reviewer can fund and claim between two independent X identities and wallets
- create, claim, cancel, and refund have Arc explorer evidence
- twenty scripted lifecycle runs complete without severity-1 or severity-2 defects
- the public evidence bundle contains no secrets and matches deployed configuration

### M2 — Security and closed pilot, weeks 6-11, $31,000

Commission an independent contract/application authorization review, remediate findings, complete accessibility and responsive testing, and run a consent-based closed pilot with privacy-preserving instrumentation.

Acceptance:

- all critical/high findings are remediated and retested or explicitly accepted by a named owner
- at least 50 consented testers and 100 funded testnet payments participate in this milestone
- at least 80% of recipients who start the claim flow submit a claim successfully
- unauthorized-view tests record zero private amount, sender, or memo disclosures
- pilot report includes funnel, failures, qualitative findings, limitations, and product decisions

### M3 — Production readiness, weeks 12-16, $20,000

Deliver managed signing and key-rotation controls, shared session/rate-limit architecture, monitoring and alerting, backup/recovery exercises, legal/compliance review, and a signed mainnet go/no-go assessment.

Acceptance:

- at least 100 testers and 250 funded testnet payments are reached cumulatively, or the report recommends stopping with evidence
- backup restore and indexer recovery are demonstrated in staging
- alerts have named responders and severity targets
- deployer credentials are absent from long-running application hosts
- unresolved risks have owners, deadlines, and explicit launch conditions

Detailed cost and milestone evidence is in `docs/budget-and-milestones.md`.

## Pilot measurement

Primary measures:

- valid payment intent to verified funded payment conversion
- claim start and successful claim completion
- median active claim-flow time, excluding time away from the product
- terminal resolution through claim, cancel, or refund
- X/wallet/chain failure distribution
- private-field authorization accuracy
- participant comprehension of custody, claim, and refund behavior
- support conversations per completed payment

Targets include at least 100 testers, 250 funded payments, at least 80% claim completion among recipients who begin claiming, median active claim flow of five minutes or less, and 100% privacy authorization accuracy in the test matrix. These are proposed targets, not existing traction.

The full methodology and event/data minimization plan is in `docs/pilot-and-impact.md`.

## Ecosystem impact

The immediate output is a reusable reference for identity-addressed Arc payments: an open implementation pattern, a deployed escrow, documented authorization boundaries, test coverage, and public pilot evidence. If successful, the pattern could support creator payouts, community rewards, reimbursements, social payment links, and integrations where the sender knows a person or account but not a wallet address.

Public grant outputs should include source code subject to the final license choice, verified contract source, deployment metadata, security-review summary, milestone reports, pilot methodology, and aggregated results that do not expose private payment metadata.

## Sustainability

The initial protocol fee is bounded on-chain and routed at payment creation. The pilot should test whether a transparent per-payment fee can support RPC, hosting, monitoring, support, and continued maintenance without making small payments unattractive.

No revenue or unit-economics claims are made yet. Before production, the team will publish the proposed fee, treasury policy, expected infrastructure cost bands, and governance for changing verifier, treasury, owner, pause, and minimum fee settings.

Potential post-grant paths, outside committed scope, include an API/SDK for communities, creator payment requests, organization controls, and additional identity providers. Expansion should follow evidence from the single-network, single-asset pilot.

## Use of funds

Proposed allocation:

- $30,000 protocol and application engineering
- $18,000 independent security review
- $8,000 infrastructure and operations
- $7,000 product, accessibility, and research
- $6,000 pilot operations and incentives
- $4,000 legal and compliance review
- $2,000 controlled contingency

Each category, milestone trigger, evidence requirement, and change-control threshold is defined in `docs/budget-and-milestones.md`.

## Risks and mitigations

| Risk | Mitigation in scope | Residual decision |
| --- | --- | --- |
| X API policy, access, or outage | Immutable ID binding, explicit integration health, clear errors, dependency monitoring | Decide whether a second identity provider is necessary after pilot |
| X account compromise | Fresh OAuth near claim and separate wallet proof | Social account security remains external |
| Verifier key compromise | Context-bound short-lived signatures, key separation, monitoring, managed signer plan | Production launch waits for acceptable key controls |
| Contract defect | Automated invariant-oriented tests, independent review, limited testnet pilot | External review cannot eliminate all smart-contract risk |
| RPC/indexer inconsistency | Receipt/event verification, durable checkpoint, recovery tests, planned redundant RPC | Production SLO depends on provider architecture |
| Privacy misunderstanding | API data minimization and explicit blockchain-visibility copy | On-chain transactions remain publicly observable |
| Regulatory obligations | Jurisdiction-specific product/legal review before mainnet | Launch geography and product terms may need restriction |

The complete threat model is in `docs/security.md`.

## Team

`TEAM INPUT REQUIRED`:

| Role | Required submission content |
| --- | --- |
| Project/accountable lead | Name, jurisdiction, time commitment, relevant delivery history, profile links |
| Protocol/backend lead | Name, contract/backend experience, shipped repositories or deployments, time commitment |
| Product/design lead | Name, consumer-fintech or wallet UX experience, portfolio, time commitment |
| Security/operations owner | Named internal owner plus external reviewer procurement plan |
| Applicant | Legal entity or individual, address if required, tax/payment details supplied privately to the program |

Do not invent biographies. If one person holds multiple roles, state that directly and give the weekly commitment and delivery responsibility.

## Public links

`TEAM INPUT REQUIRED`:

- repository and license
- hosted demo and status page
- deployed contract and Arc explorer page
- deployment transaction and manifest
- CI/test run
- demo video
- project X account and contact email
- security contact
- pitch deck, if requested

## Reviewer closing statement

HandleLayer already has the technical core required to test identity-addressed USDC payments: custody rules on Arc, identity and wallet proofs off-chain, verified lifecycle transitions, privacy-scoped API views, persistence, indexing, and automated tests. The grant is not requested to fund a slide-only concept. It is requested to convert an existing local MVP into public infrastructure, independently challenge its security assumptions, measure real user behavior on Arc Testnet, and reach an evidence-based production decision.
