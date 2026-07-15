# PACT Delivery Roadmap

## Delivery principle

Each phase ends with public or reviewer-accessible evidence, not only a statement that work is complete. Mainnet launch is intentionally outside the automatic grant path: the final milestone produces a go/no-go decision.

## Current baseline — completed locally

- browser product and Express API
- PostgreSQL schema, migrations, sessions, payments, audit logs, and indexer checkpoint
- X OAuth 2.0 PKCE and immutable X user lookup implementation
- one-time wallet ownership proof
- Arc transaction construction and funding/settlement verification
- USDC escrow contract and Arc deployment script
- event indexer, rate limits, health endpoint, and security headers
- automated API, security, and contract tests plus dependency lockfile
- grant, architecture, security, deployment, demo, pilot, and status documentation

This baseline is repository evidence, not a claim of live deployment, audit, users, or production readiness.

## 16-week schedule

| Week | Workstream | Exit evidence |
| ---: | --- | --- |
| 1 | Freeze pilot scope; select hosting/RPC; finalize X app and role addresses | Configuration register and threat review |
| 2 | Deploy escrow; verify source; publish deployment manifest | Explorer, source, transaction, deployment block |
| 3 | Host API/frontend/database/indexer; HTTPS and secrets setup | Live URL, health, runbook |
| 4 | End-to-end lifecycle matrix and wallet/browser validation | Create/claim/cancel/refund evidence |
| 5 | Reviewer demo, defects, M1 acceptance | M1 signed checklist and video |
| 6 | Independent review kickoff; instrumentation and consent design | Review scope and pilot protocol |
| 7 | Contract/API authorization review; accessibility testing | Findings register |
| 8 | Remediation sprint and retest | Remediation commits and retest status |
| 9 | Closed pilot wave 1 | Funnel snapshot and support log |
| 10 | UX fixes; closed pilot wave 2 | Before/after evidence |
| 11 | Pilot analysis and M2 acceptance | Review summary and pilot report |
| 12 | Managed signer and key rotation | Design/implementation evidence |
| 13 | Monitoring, alerts, shared limiter/session strategy | Dashboard and alert runbook |
| 14 | Backup restore, indexer replay, incident simulation | Exercise reports |
| 15 | Legal/compliance review and residual-risk workshop | Launch constraints and risk owners |
| 16 | Final evidence index and go/no-go decision | M3 checklist and launch assessment |

## Milestone 1 — Public Arc Testnet

Outcome: a reviewer can complete a real sender-to-recipient flow with Arc Testnet USDC.

Deliverables:

- deployed, explorer-verified `HandlePaymentEscrow`
- production callback configured in the X developer application
- hosted frontend, API, PostgreSQL, and indexer over HTTPS
- public contract/deployment manifest and release tag
- operations, rollback, incident, and known-issues runbooks
- repeatable demo for create, claim, cancel, and expired refund

Exit criteria:

- all integration health flags ready
- two independent X accounts and wallets complete a payment
- twenty scripted lifecycle runs have no severity-1/2 defect
- database funded/settled states have matching explorer evidence
- public configuration contains no secret value

## Milestone 2 — Security and closed pilot

Outcome: custody, authorization, privacy, usability, and the product hypothesis are tested with independent and user evidence.

Deliverables:

- independent security findings and remediation/retest log
- complete API authorization matrix
- accessibility and responsive test report
- privacy-preserving instrumentation and consent process
- closed-pilot support workflow and final report

Exit criteria:

- no unresolved critical/high finding without explicit named acceptance
- at least 50 testers and 100 funded payments during M2
- at least 80% successful claims among users who start claiming
- zero unauthorized private-field disclosure in the test matrix
- top failure categories have owners and remediation decisions

## Milestone 3 — Production readiness

Outcome: the project can make a defensible production launch decision.

Deliverables:

- managed verifier signing and rotation plan/implementation
- shared rate-limit and session design for multiple replicas
- monitoring for API, database, signer, indexer lag, RPC, and contract administration
- tested backup/restore, indexer replay, rollback, and incident response
- legal/compliance review and launch-jurisdiction constraints
- residual-risk register and signed go/no-go assessment

Exit criteria:

- cumulative target of 100 testers and 250 funded testnet payments, or evidence-backed stop decision
- staged restore/recovery exercises pass
- every production alert has responder and severity target
- deployment, owner, verifier, and treasury roles are separated
- production deployer credentials are not present on application hosts

## Dependencies and schedule risk

| Dependency | Risk | Mitigation |
| --- | --- | --- |
| X developer access | Approval or policy delay blocks public identity flow | Begin approval in week 1; keep failure behavior explicit; do not substitute fake IDs |
| Arc RPC/testnet | Outage or instability blocks evidence collection | Primary/fallback RPC plan and reschedulable test windows |
| Testnet USDC funding | Faucet constraints slow cohort | Pre-fund controlled test wallets within program rules |
| External review | Reviewer availability shifts M2 | Procure during M1; freeze review commit and scope |
| Pilot recruitment | Low participation weakens conclusions | Recruit cohorts before M1 exit; run two waves |
| Legal scope | Jurisdiction limits launch model | Review before mainnet decision, not after public-value launch |

## Post-grant opportunities

These are hypotheses and are not included in the 16-week budget:

- creator payment requests and recurring support
- organization/team payment controls
- embeddable payment links and API/SDK
- additional verified identity providers
- sponsored gas or delegated onboarding
- privacy-preserving fraud and reputation signals

Expansion should follow pilot evidence and a new security review when it changes custody, authorization, networks, assets, or identity providers.
