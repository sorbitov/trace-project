# PACT Budget and Milestones

## Planning basis

This document is a proposed grant budget, not a record of committed spend or vendor quotations. It assumes a 16-week Arc Testnet delivery period and a total request of **USD 75,000**. Adjust it to the program's maximum award, eligible-cost policy, currency, tax treatment, and reporting schedule.

## Budget by milestone

| Milestone | Period | Grant amount | Share | Payment trigger |
| --- | --- | ---: | ---: | --- |
| M1. Public Arc Testnet | Weeks 1-5 | $24,000 | 32.0% | Public evidence package passes acceptance checklist |
| M2. Security and Closed Pilot | Weeks 6-11 | $31,000 | 41.3% | Review/remediation report and pilot report delivered |
| M3. Production Readiness | Weeks 12-16 | $20,000 | 26.7% | Operations pack and signed go/no-go assessment delivered |
| **Total** | **16 weeks** | **$75,000** | **100%** |  |

## Budget by cost category

| Category | Amount | Share | What it funds |
| --- | ---: | ---: | --- |
| Protocol and application engineering | $30,000 | 40.0% | Deployment hardening, integration completion, indexer/reconciliation, test coverage, remediation |
| Independent security review | $18,000 | 24.0% | Contract and authorization review, report, retest allowance |
| Infrastructure and operations | $8,000 | 10.7% | Managed PostgreSQL, hosting, RPC redundancy, logging, monitoring, backups, staging |
| Product, accessibility, and research | $7,000 | 9.3% | Responsive/accessibility pass, moderated sessions, onboarding and claim-flow refinement |
| Pilot operations and incentives | $6,000 | 8.0% | Consent-based tester incentives, support, pilot coordination, evidence collection |
| Legal and compliance review | $4,000 | 5.3% | Product-model, terms, privacy, and launch-jurisdiction review |
| Contingency | $2,000 | 2.7% | Approved delivery variance; unused balance remains unclaimed or is reallocated with approval |
| **Total** | **$75,000** | **100%** |  |

## M1 — Public Arc Testnet

**Objective:** turn the local MVP into a publicly inspectable, repeatable testnet product.

Deliverables:

1. Deploy `HandlePaymentEscrow` to Arc Testnet with separate owner, verifier, and treasury roles.
2. Verify and publish contract source, address, deployment transaction, deployment block, constructor values, and compiler settings.
3. Configure the X developer application, production callback URL, and least-privilege OAuth scopes.
4. Host the frontend, API, PostgreSQL, and indexer in a staging environment with HTTPS.
5. Publish deployment, rollback, incident, and operator runbooks.
6. Publish a reviewer demo and evidence bundle for create, claim, cancel, and expired refund.

Acceptance criteria:

- `/api/health` reports database, chain, X OAuth, and X lookup dependencies ready.
- A reviewer using two independent X identities and wallets can fund and claim a real Arc Testnet USDC payment.
- Funding state is recorded only after a successful Arc receipt and matching `PaymentCreated` event.
- Claim, cancel, and refund settlement can each be linked to explorer evidence.
- Twenty scripted lifecycle runs complete without a severity-1 or severity-2 defect.
- Public documentation contains no secrets and all published addresses match deployed configuration.

Evidence:

- hosted URL and health response
- explorer links and verified source
- release tag and test output
- runbook links
- short demo recording
- acceptance checklist signed by the technical lead

## M2 — Security and Closed Pilot

**Objective:** validate custody, authorization, privacy, usability, and the core identity-addressed payment hypothesis.

Deliverables:

1. Independent review of the escrow, claim-signing boundary, OAuth/session handling, and payment-view authorization.
2. Public or reviewer-accessible findings summary with severity, remediation commit, and retest status.
3. Accessibility and responsive review covering keyboard use, contrast, readable text, errors, loading, and wallet rejection states.
4. Consent-based closed pilot with support workflow and privacy-preserving event instrumentation.
5. Pilot report with funnel metrics, failure categories, user feedback, and prioritized product changes.

Acceptance criteria:

- All critical and high findings are fixed and retested, or explicitly accepted by a named owner with rationale.
- At least 50 consented testers participate during this milestone.
- At least 100 payments reach funded status on Arc Testnet.
- At least 80% of recipients who start the claim flow successfully submit a claim transaction.
- The authorization matrix records zero private-field disclosures to unrelated sessions.
- Every failed lifecycle action is assigned a machine-readable category and request or transaction identifier.

Evidence:

- review and remediation report
- automated and manual authorization matrix
- anonymized pilot funnel export
- usability findings and before/after screenshots
- issue register with owner and disposition

## M3 — Production Readiness

**Objective:** produce a defensible go/no-go decision for handling public value.

Deliverables:

1. Managed verifier signing design or implementation, with rotation and emergency-revocation procedures.
2. Multi-replica session and shared rate-limit design.
3. Monitoring for API error rate, indexer lag, failed receipt verification, signer activity, contract administration, and database health.
4. Tested backup, restore, key rotation, incident response, and service rollback exercises.
5. Mainnet threat review, legal/compliance review, launch checklist, and residual-risk register.

Acceptance criteria:

- At least 100 testers and 250 funded payments have been reached cumulatively, or the report explains why the pilot should stop.
- Backup restoration and indexer recovery are demonstrated in staging.
- Alerts have a named responder, severity, and response-time target.
- Production deployer credentials are absent from long-running application hosts.
- A signed go/no-go document lists unresolved risks, owners, deadlines, and explicit launch conditions.

## Reporting cadence

- Weekly: progress, spend against category, blockers, security incidents, and KPI snapshot.
- At each milestone: evidence links, acceptance checklist, budget variance, and next-milestone decision.
- At completion: final deliverables index, KPI report, risk register, source/deployment links, and unspent-funds statement.

## Change control

A change should require grant-owner approval when it moves more than 10% of the total budget between categories, changes a milestone acceptance criterion, delays delivery by more than two weeks, or materially expands custody, identity providers, networks, or supported assets.
