# HandleLayer on Arc

Send USDC to an X handle. The recipient proves the X identity, connects an Arc wallet, and claims from an onchain escrow.

The repository now contains a testnet-ready implementation rather than a JSON-state payment mock:

- Arc Testnet wallet switching and ERC-20 USDC approval
- onchain escrow creation, claim, cancel, and expired refund
- X OAuth 2.0 PKCE and immutable X user lookup
- wallet ownership challenges signed with `personal_sign`
- PostgreSQL profiles, sessions, payment intents, indexer state, and audit logs
- scoped/private API payment views
- receipt and contract-event verification
- polling Arc event indexer
- rate limits and HTTP security headers
- Hardhat build, Solidity security tests, API tests, and dependency lockfile

## Local setup

Requirements: Node.js 22+, Docker Desktop, an X developer app, and an Arc Testnet wallet.

```powershell
Copy-Item .env.example .env
npm install
npm run db:up
npm run db:migrate
npm start
```

Open `http://127.0.0.1:4174/index.html`.

Without X and contract environment variables the landing page still opens, but payment actions intentionally return configuration errors instead of creating fake records.

## Test and build

```powershell
npm test
npm audit
npm run check
```

## Arc deployment

Current Arc Testnet deployment:

- Contract: [`0x5A3949aE67a37e7e37bFC77F5b7832Cc93f40A2a`](https://testnet.arcscan.app/address/0x5A3949aE67a37e7e37bFC77F5b7832Cc93f40A2a)
- Deployment transaction: [`0xa3f80c8e…d9c97e`](https://testnet.arcscan.app/tx/0xa3f80c8ee66e9ae22900e8b119caf391b16830f60ee921565b4ffd9cc7d9c97e)
- Deployment manifest: [`deployments/arc-testnet.json`](deployments/arc-testnet.json)
- Source verification: pending Arcscan indexing; bytecode and configuration verified through RPC

1. Fund the deployer with Arc Testnet USDC from the Circle faucet.
2. Set `DEPLOYER_PRIVATE_KEY`, `VERIFIER_PRIVATE_KEY`, `TREASURY_ADDRESS`, and optionally `CONTRACT_OWNER_ADDRESS` in `.env`.
3. Run `npm run contract:deploy`.
4. Copy the resulting address and block from `deployments/arc-testnet.json` to `ESCROW_CONTRACT_ADDRESS` and `ESCROW_DEPLOYMENT_BLOCK`.
5. Restart the server and check `GET /api/health`.

Full configuration and operational checks are in [docs/deployment.md](docs/deployment.md).

## Reviewer and grant documentation

- [Executive summary](docs/executive-summary.md)
- [Grant application](docs/grant-application.md)
- [Budget and milestones](docs/budget-and-milestones.md)
- [Pilot and impact plan](docs/pilot-and-impact.md)
- [Project status and evidence](docs/project-status.md)
- [Architecture](docs/architecture.md)
- [Security model](docs/security.md)
- [Internal security review](docs/internal-security-review.md)
- [Roadmap](docs/roadmap.md)
- [Reviewer demo guide](docs/demo-guide.md)
- [Submission checklist](docs/submission-checklist.md)

The browser-friendly document hub is available at `http://127.0.0.1:4174/docs.html`. The pack includes a proposed 16-week, USD 75,000 baseline plan with objective milestone evidence and pilot targets. Accountable team identities, the selected program's rules, final budget approval, public repository/deployment links, and demo video still require real team input before submission.

## Important security properties

- The backend never marks a payment funded without verifying an Arc receipt and matching `PaymentCreated` event.
- Claim signatures bind the payment ID, recipient wallet, chain ID, contract address, and authorization expiry.
- Refund remains available when the contract is paused.
- X and wallet identities are proven separately and joined only inside a server session.
- Private amount, sender, and memo fields are omitted from unauthorized API responses.

The escrow contract is deployed on Arc Testnet. Live application operation still requires managed secrets, PostgreSQL, funded test accounts, X recipient lookup, hosting, and end-to-end acceptance evidence.

## License and security reports

The repository is licensed under the [MIT License](LICENSE). Please report suspected vulnerabilities privately through the repository's security advisory channel as described in [SECURITY.md](SECURITY.md).
