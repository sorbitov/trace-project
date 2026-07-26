# TRACE Internal Security Review

Date: 15 July 2026

Scope: repository implementation at the current working tree

Review type: internal code and automated-test review; not independent assurance

## Outcome

No known critical or high-severity issue remains from this review. Two defense-in-depth findings were fixed during review:

1. Return-path validation now rejects backslashes as well as absolute and protocol-relative URLs. This prevents future callers from accidentally treating a browser-normalized `\/\/host` form as a trusted local path.
2. Payment expiry and fee inputs now reject non-finite numeric values before persistence instead of allowing `NaN` to reach database or transaction construction paths.

OAuth callback failures are now logged with a request ID and returned to the browser as a stable generic error code rather than reflecting upstream error text into the URL.

Regression evidence is in `test/security.test.js`, the payment API path, and the full `npm test` suite.

## Reviewed surfaces

- `HandlePaymentEscrow` lifecycle, fee transfer, signature domain separation, replay protection, pause behavior, role rotation, cancellation, and refund.
- X OAuth PKCE state/session binding and immutable X user lookup.
- Wallet ownership challenges, expiry, one-time consumption, and provider request coordination.
- Session cookies, rate limiting, headers, request sizes, redirects, and error handling.
- Funding and settlement receipt/event verification.
- Viewer-scoped payment projections and private field handling.
- PostgreSQL-backed sessions, identities, payments, audit logs, and indexer checkpoints.
- Dependency audit and automated regression suites.

## Residual risks and required external evidence

| Priority | Residual risk | Required closure evidence |
| --- | --- | --- |
| Critical gate | Verifier, owner, deployer, and treasury key handling is not exercised in managed infrastructure | Separated testnet roles, rotation drill, secrets inventory, and deployer-key removal evidence |
| High gate | Contract has not received an independent review or public testnet lifecycle test | Independent contract/backend report plus remediation retest |
| High gate | Real X account and policy behavior is not covered by mocked/local tests | Two controlled X identities, exact callback, bearer lookup, mismatch test, and token-rotation owner |
| High gate | RPC correctness, reorg handling, and indexer recovery rely on a single configured provider | Primary/fallback RPC test, confirmation policy, replay and reconciliation drill |
| High gate | Production authorization/privacy matrix is incomplete | Actor-by-endpoint regression matrix against the hosted environment |
| Medium gate | `trust proxy = 1` and in-memory rate limiting require a single known proxy topology | Hosting diagram, direct-origin blocking, shared limiter or single-replica decision |
| Medium gate | Database backup, retention, audit access, and incident procedures are documentation-only | Restore drill, retention settings, responder ownership, and incident exercise |
| Medium gate | Browser/mobile/hardware wallet compatibility is not broadly tested | Recorded wallet/device matrix and failure recovery results |

## Independent review scope

The external reviewer should receive the exact release commit, compiler settings, deployment manifest, contract source and bytecode, architecture and threat model, API/DB schema, test output, and a low-value Arc Testnet environment. At minimum, the review should cover:

1. escrow accounting and non-standard ERC-20 behavior;
2. claim digest/signature correctness and verifier compromise boundaries;
3. owner/verifier/treasury role separation and emergency behavior;
4. OAuth/session/wallet binding and authorization freshness;
5. receipt/event verification, reorgs, indexer replay, and duplicate settlement;
6. private-field authorization across every endpoint and actor;
7. secret handling, deployment topology, rate-limit bypass, and recovery operations.

Public launch should block on remediation of every critical/high finding or an explicitly signed risk acceptance by the accountable owner.
