# Contributing to PACT

PACT is a testnet-stage project. Contributions should preserve the non-custodial escrow lifecycle, explicit identity proofs, and the distinction between private API metadata and public onchain data.

## Development setup

1. Install Node.js 22+ and Docker Desktop.
2. Copy `.env.example` to `.env` and use test-only credentials.
3. Run `npm ci`, `npm run db:up`, and `npm run db:migrate`.
4. Run `npm test`, `npm audit --audit-level=high`, and `npm run check` before opening a pull request.

Never commit `.env`, private keys, OAuth tokens, database dumps, wallet signatures, private memos, or personal data. Use low-value Arc Testnet accounts only.

## Pull requests

- Keep each pull request focused and explain the user or security impact.
- Add regression tests for behavior changes.
- Document contract, environment, migration, privacy, or deployment changes.
- Do not change a deployed contract address or deployment evidence retroactively.
- Treat changes to claim authorization, receipt verification, OAuth, wallet proof, role controls, and refunds as security-sensitive.

Report vulnerabilities through the private process in [SECURITY.md](SECURITY.md), not through a public issue.
