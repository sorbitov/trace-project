# Roadmap

## Phase 1: Idea and Product Definition

Goal: Lock the product idea, user promise, v1 flow, and business rules.

Includes:

- Product vision: send USDC to any X handle, claim with X.
- Target users: web3 users, creators, builders, traders, KOLs, founders, bounty hunters.
- Core payment type: unconditional tip/donation.
- Identity model: X handle first, immutable X user ID resolution by backend.
- Claim flow: X OAuth -> connect wallet -> claim.
- Expiry/refund rules: 30 days default, sender-controlled cancel/refund.
- Privacy posture: private memo/amount/sender options, but not full cryptographic privacy.
- Fee rule: mandatory sender fee, minimum 0.5%.

Success criteria:

1. The idea can be explained in one sentence.
2. The v1 sender and recipient flows are locked.
3. X OAuth, Arc USDC escrow, expiry, fee, and refund rules are documented.

## Phase 2: Current Dapp Prototype

Goal: Document and maintain everything already built in the local working prototype.

Includes:

- Home page that introduces HandlePay.
- Dapp shell entered from home.
- Send, Claim, History, and Profile views.
- Profile registration modal inside the dapp.
- Registration flow: Connect X/Twitter -> connect wallet -> create profile.
- Server-backed state through local API routes.
- Persisted dashboard and payments in `data/state.json`.
- Payment creation form with handle, amount, expiry, visibility, cancel mode, fee, and memo.
- Generated X mention copy and claim/status URL.
- Claim flow with X verification step, wallet connect, claim, cancel, and history.

Success criteria:

1. The prototype opens at `http://127.0.0.1:4174/index.html`.
2. User can enter the dapp before registration.
3. Sending is gated until profile creation.
4. Registration is a modal, not a separate full-screen page.
5. Local API supports dashboard, payments, verify X, claim, cancel, and state.

## Phase 3: SEO and GEO

Goal: Make HandlePay discoverable by search engines and understandable to AI answer engines.

Includes:

- `.planning/SEO.md` as the source of truth.
- Home page title, meta description, keywords, canonical, robots meta.
- Open Graph and Twitter Card metadata.
- SoftwareApplication JSON-LD.
- `robots.txt` and `sitemap.xml`.
- Keyword targets around X handle payments, USDC tips, stablecoin payment links, Arc payments, and Web3 creator payments.
- Future FAQPage schema and public `/@handle` metadata.

Success criteria:

1. Home page has crawlable metadata.
2. `robots.txt` and `sitemap.xml` exist.
3. JSON-LD validates.
4. SEO/GEO requirements stay in GSD.
5. Future public pages get metadata before launch.

## Phase 4: Smart Contracts and Arc Testnet

Goal: Build the real onchain Arc USDC escrow layer.

Includes:

- `HandlePaymentEscrow` contract.
- Payment intent creation to X identity/user ID.
- USDC escrow funding.
- Claim with backend verifier signature.
- Refund/cancel path.
- Verifier signer rotation.
- Pause/emergency controls.
- Events for indexing history.
- Arc Testnet deployment.
- Contract tests for replay, wrong wallet, wrong chain, expired signature, refund, and pause behavior.

Success criteria:

1. Contract can create, claim, and refund payment intents.
2. Claim authorization is bound to payment ID, wallet, chain ID, expiry, and verifier signer.
3. Tests cover critical security paths.
4. Contract deploys to Arc Testnet.
5. Frontend/backend stop relying on local-only payment state for final launch checks.

## Phase 5: Backend, Integrations, and Testnet Launch Loop

Goal: Connect real X OAuth, backend verifier, indexer, contracts, and launch operations.

Includes:

- Production X OAuth app configuration.
- X user ID lookup and claim verification.
- Claim authorization signer.
- Backend rate limits and audit logs.
- Contract event indexer.
- Prepared backend data and PostgreSQL persistence.
- Testnet funding and signer management.
- Metrics for created payments, claimed payments, refunds, and OAuth failures.
- Operational docs for early testers.

Success criteria:

1. End-to-end Arc Testnet flow is repeatable.
2. Sender can fund real USDC testnet escrow.
3. Recipient can claim through real X OAuth and wallet connection.
4. History reflects indexed onchain events.
5. A public test campaign can be run with known risks documented.

## Phase Organization Rule

New work should be added under the matching phase subsection:

- product idea/rules -> Phase 1
- current prototype/UI/API behavior -> Phase 2
- SEO/GEO/content/discoverability -> Phase 3
- Solidity/contracts/Arc Testnet deployment -> Phase 4
- real backend, integrations, indexer, launch ops -> Phase 5
