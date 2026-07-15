# PACT Arc Testnet Deployment and Operations

## Purpose

Deploy a reviewable Arc Testnet environment with separated roles, reproducible contract metadata, a configured X identity flow, durable PostgreSQL state, an event indexer, and enough operational evidence to support the first grant milestone.

## Network configuration

| Setting | Arc Testnet value |
| --- | --- |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| ERC-20 USDC | `0x3600000000000000000000000000000000000000` |
| USDC transfer decimals | `6` |
| Native gas currency display | USDC, `18` decimals |

Defaults can be overridden through environment configuration, but the backend verifies `eth_chainId` before accepting funding evidence or signing claims.

## Role separation

Use different addresses for:

- **Deployer:** temporary contract deployment capability; remove from application hosts after deployment.
- **Owner:** administrative contract control; target a hardware-backed multisig.
- **Verifier:** claim authorization only; target an isolated managed signer.
- **Treasury:** receives the protocol fee; no deployment or verification authority.
- **Sender/recipient test wallets:** low-value pilot accounts with no administrative role.

Record public role addresses in the deployment manifest. Never record private keys or seed phrases.

## Configuration register

| Variable | Secret | Required for | Production handling |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | API, migration, indexer | Managed secret; TLS and least-privilege DB user |
| `SESSION_SECRET` | Yes | Session and keyed IP hashing | High-entropy managed secret; rotation plan |
| `BASE_URL` | No | Cookies, challenge origin, links | Exact HTTPS origin |
| `X_CLIENT_ID` | Usually no | OAuth start | X app configuration |
| `X_CLIENT_SECRET` | Yes when confidential | OAuth token exchange | Managed secret |
| `X_BEARER_TOKEN` | Yes | Recipient handle lookup | Managed secret, scoped/rotated |
| `X_REDIRECT_URI` | No | OAuth callback | Exact X-approved HTTPS URL |
| `ARC_RPC_URL` | May be | Chain reads/receipts/indexer | Provider secret if authenticated; fallback plan |
| `ARC_CHAIN_ID` | No | Chain context | Must equal deployed network |
| `USDC_ADDRESS` | No | Token interaction | Verify byte-for-byte against official testnet value |
| `ESCROW_CONTRACT_ADDRESS` | No | Product and verification | Populate after deployment |
| `ESCROW_DEPLOYMENT_BLOCK` | No | Indexer start | Populate from deployment receipt |
| `VERIFIER_PRIVATE_KEY` | Yes | Claim signing | Testnet env only; managed signer before production |
| `TREASURY_ADDRESS` | No | Contract deployment | Separate controlled address |
| `CONTRACT_OWNER_ADDRESS` | No | Contract deployment | Hardware/multisig target |
| `DEPLOYER_PRIVATE_KEY` | Yes | Deployment command only | Ephemeral secure environment; remove afterward |
| `MINIMUM_FEE_BPS` | No | Contract/API terms | Confirm against published economics |

Start from `.env.example`, but store live values outside version control.

## Preflight

```powershell
npm install
npm run db:up
npm run db:migrate
npm test
npm audit
npm run check
```

Confirm:

1. Git status and release commit are recorded.
2. The deployer is on Arc Testnet and has enough native gas balance.
3. Treasury, owner, and verifier are valid, separate addresses.
4. The verifier public address derived from the configured key is documented.
5. USDC and RPC values match the target network.
6. No key, token, database password, or `.env` appears in Git history or logs.

## Contract deployment

```powershell
npm run contract:deploy
```

The script checks the RPC chain ID and writes non-secret metadata to `deployments/arc-testnet.json`. Capture:

- contract address
- deployment transaction hash and block
- deployer, owner, verifier, treasury, and USDC addresses
- minimum fee
- compiler version, optimizer settings, source commit, and timestamp

Verify the contract source in the Arc explorer. Compare deployed runtime bytecode/metadata with the local build where the explorer supports it.

After verification:

1. Set `ESCROW_CONTRACT_ADDRESS` and `ESCROW_DEPLOYMENT_BLOCK`.
2. Remove `DEPLOYER_PRIVATE_KEY` from the long-running environment.
3. Confirm on-chain `owner`, `verifier`, `treasury`, `USDC`, minimum fee, and pause state.
4. Publish the sanitized deployment manifest.

## X application setup

Register the exact HTTPS callback from `X_REDIRECT_URI`. The user login flow uses OAuth Authorization Code with PKCE and `users.read tweet.read`. The bearer token is separate and is used for server-side `/2/users/by/username/:username` resolution.

Confirm the production X application has current privacy/terms URLs, least-privilege scopes, correct callback, controlled developer-account access, and a documented token rotation owner.

## Application rollout

Recommended pilot topology:

- HTTPS reverse proxy/CDN
- one API replica initially unless shared rate limiting/session behavior is ready
- managed PostgreSQL with encryption, backups, and point-in-time recovery
- dedicated indexer worker
- primary and fallback Arc RPC
- centralized logs, metrics, and alerts
- secrets injected by the hosting platform

Run migrations as a controlled release step before switching traffic. Start the API, then the indexer. Do not expose the demo until health and lifecycle smoke tests pass.

## Smoke and acceptance tests

1. `GET /api/health` reports PostgreSQL healthy and chain/X integrations ready.
2. `GET /api/config` shows correct public chain values and no secret.
3. Connect sender wallet and X identity.
4. Fund a 1 USDC cancellable payment and verify approval, `PaymentCreated`, and pending state.
5. Open the exact claim link in a separate session and authenticate the intended X account.
6. Prove recipient wallet and claim; verify `Claimed` and recipient transfer.
7. Repeat with cancellation, locked-mode rejection, and expired refund.
8. Test wrong X account, wrong wallet, wrong chain, reverted transaction, and unrelated-session privacy.
9. Restart the indexer and verify checkpoint resume/reconciliation.

Use `docs/demo-guide.md` to package evidence.

## Monitoring

Track at minimum:

- API availability, latency, 4xx/5xx rate, and rate-limit rejects
- PostgreSQL connections, storage, query errors, and backup success
- OAuth start/callback/state failures and X lookup rate limits
- Arc RPC latency/errors and primary/fallback disagreement
- receipt/event verification mismatch
- indexer head, checkpoint, lag, replay, and crash loop
- verifier signing rate and rejected authorization rate
- contract owner/verifier/treasury/fee/pause events
- funded payments without timely lifecycle reconciliation

Every alert must have a severity, primary/backup responder, response target, containment action, and evidence link.

## Backup and recovery

For the pilot, define and test:

- database backup frequency and retention
- target recovery point and recovery time
- restoration into an isolated environment
- indexer replay from the deployment block or last trusted checkpoint
- reconciliation of every stored on-chain payment against contract events
- session invalidation if session integrity is uncertain

The chain is settlement authority, but database loss still affects identity/session metadata and service usability. A restored database must be reconciled before reopening mutations.

## Rollback

Application rollback:

1. Stop new mutations at the edge if integrity is uncertain.
2. Preserve logs, request IDs, database snapshot, and deployment metadata.
3. Roll back the application to the last verified release without changing contract address.
4. Replay/reconcile events and run smoke tests before reopening.

Contract incident:

1. Pause create/claim if the owner determines they are unsafe.
2. Keep cancellation and expired refund available by design.
3. Revoke/rotate verifier when signer compromise is suspected.
4. Publish incident status and user recovery instructions.
5. Do not migrate escrowed principal through an unreviewed emergency mechanism.

## Production gates

Testnet success does not authorize mainnet. Before handling public value, require independent security review and retest, managed signing, hardware/multisig owner, RPC redundancy/reorg policy, shared rate-limit/session strategy or single-replica decision, tested restore/recovery and key rotation, disclosure/incident policies, privacy/legal review, and a signed go/no-go assessment.
