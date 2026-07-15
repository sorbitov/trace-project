# PACT Project Status and Evidence

Updated: 15 July 2026

## Status statement

PACT is a testnet-deployed MVP. The escrow is live on Arc Testnet and RPC-verified; the application, X integration, PostgreSQL service, and indexer are not yet publicly hosted. Arcscan source verification and an external security audit remain pending.

## Capability matrix

| Capability | Status | Repository evidence | Remaining work |
| --- | --- | --- | --- |
| USDC escrow create/claim/cancel/refund | Deployed and smoke-tested | Contract, tests, deployment manifest with six transaction hashes | Arcscan source verification and external review |
| Mandatory fee routing | Implemented locally | Contract `createPayment`; fee test | Publish treasury governance and accounting policy |
| Arc wallet transaction flow | Implemented locally | `app/app.js`, `src/chain.js` | Validate with production wallet matrix |
| Funding receipt and event verification | Implemented locally | `src/chain.js`, API funding route | Add redundant RPC and operational alerts |
| Settlement receipt verification | Implemented locally | `src/chain.js`, settlement route, indexer | Exercise recovery under RPC/indexer failure |
| X OAuth 2.0 PKCE | Implemented, unconfigured | `src/x-client.js`, OAuth routes, API tests | Approved X app, client credentials, production callback |
| Immutable recipient X ID lookup | Implemented, unconfigured | `resolveXUser`, payment creation route | X bearer token, rate-limit monitoring |
| Recipient/account match | Implemented locally | fresh OAuth timestamp and stored X user ID check | End-to-end testing with two real test identities |
| Wallet ownership proof | Implemented locally | `src/security.js`, wallet challenge routes/tests | Hardware/mobile wallet compatibility testing |
| Payment-specific claim link | Implemented locally | `#claim=<payment-id>` and frontend parsing | Hosted deep-link and browser testing |
| Viewer authorization | Implemented locally | `paymentView`, sender/recipient route checks | Expand full authorization regression matrix |
| Private API fields | Implemented locally | amount/sender/memo omitted for unauthorized views | Document blockchain-visible limitations |
| Expiry processing | Implemented locally | `expirePending`, refund rules, contract expiry | Verify scheduled/indexer behavior in hosted staging |
| PostgreSQL persistence | Implemented locally | `migrations/001_initial.sql`, `src/db.js` | Managed database, backups, restore drill |
| Audit logs | Implemented locally | `audit_logs` table and sensitive-route audit calls | Retention, access policy, export/alerts |
| Rate limiting and headers | Implemented locally | `express-rate-limit`, Helmet CSP | Shared rate-limit store behind multiple replicas |
| Event indexer | Implemented locally | `src/indexer.js`, durable checkpoint table | Lag metrics, RPC failover, replay drill |
| Contract build/deploy tooling | Deployed and RPC-verified | Hardhat tooling and deployment manifest | Arcscan source verification pending explorer indexing |
| Automated tests | Implemented locally | 37 API/security/contract/UI-state tests | Public CI evidence and broader integration/load coverage |
| Internal security review | Completed 15 July 2026 | `docs/internal-security-review.md` | Independent reviewer still required |
| Dependency lockfile | Implemented | `package-lock.json` | Automated update and vulnerability policy |
| Public demo | Not complete | local server only | Hosting, domain, HTTPS, public evidence |
| External audit | Not complete | security model only | Select reviewer, scope, remediate, publish summary |
| Mainnet readiness | Not complete | roadmap and deployment notes | KMS, monitoring, recovery, legal review, go/no-go |

## Automated evidence

Current verification commands:

```powershell
npm test
npm audit
npm run check
```

The current repository test set covers API sessions and security headers, configuration secrecy, retired unsafe prototype routes, X OAuth failure behavior, handle normalization, wallet signature verification, open-redirect defense, token hashing, escrow fee routing, claim binding, authorization expiry, pause/refund behavior, cancellation policy, owner/verifier protections, recipient discovery, identity state, and wallet request coordination.

## Truth boundary for reviewers

Safe claims:

- the code paths and automated tests exist in this repository
- local PostgreSQL-backed operation is available
- Arc Testnet configuration and deployment tooling are present
- missing integrations fail closed instead of producing fake payment success

Claims that require new public evidence:

- explorer-verified source and complete lifecycle transactions
- live hosted end-to-end flow
- approved/configured X application
- number of users, payments, or retained users
- external audit or formal verification
- production security, availability, or regulatory readiness

## Next evidence release

The first public release should include the repository URL and license, release tag, CI output, hosted demo, health status, contract and explorer links, deployment manifest, demo video, operator runbook, known-issues list, and a signed milestone acceptance checklist.
