# Requirements

## v1 Requirements

### Identity

- [ ] **ID-01**: Sender can enter an X handle as the recipient target.
- [ ] **ID-02**: App can normalize X handles consistently, ignoring leading `@` and casing where appropriate.
- [ ] **ID-03**: Recipient can sign in with X OAuth to prove ownership of the target X identity.
- [ ] **ID-04**: Backend can bind a verified X identity to a wallet for a specific claim attempt.
- [ ] **ID-05**: Claim authorization is bound to payment ID, wallet, chain ID, expiry, and verifier signer.

### Payments

- [ ] **PAY-01**: Sender can create a USDC payment to an X identity.
- [ ] **PAY-02**: Payment funds are held in an Arc escrow contract until claim or refund.
- [ ] **PAY-03**: Recipient can claim a funded payment after successful X OAuth verification.
- [ ] **PAY-04**: Sender can refund an expired unclaimed payment.
- [ ] **PAY-05**: Payment events expose enough data for status/history indexing.
- [ ] **PAY-06**: Payment memo/message is not stored onchain in plaintext.

### Arc

- [ ] **ARC-01**: Contracts deploy to Arc Testnet.
- [ ] **ARC-02**: USDC is the v1 payment token.
- [ ] **ARC-03**: Frontend connects wallets to Arc Testnet.
- [ ] **ARC-04**: Backend verifies the configured chain ID before signing claim authorizations.

### Security

- [ ] **SEC-01**: Claim signatures cannot be replayed across payments, wallets, chains, or expiry windows.
- [ ] **SEC-02**: Verifier signer can be rotated.
- [ ] **SEC-03**: Escrow can be paused for emergency response.
- [ ] **SEC-04**: Backend rate limits OAuth and claim authorization attempts.
- [ ] **SEC-05**: Refund path remains available if X verification is down.

### UX

- [ ] **UX-01**: Sender gets a shareable claim/status link after funding.
- [ ] **UX-02**: App generates X share copy for notifying recipients.
- [ ] **UX-03**: Recipient can understand why they are being asked to connect wallet and sign in with X.
- [ ] **UX-04**: App clearly shows payment status: pending, claimed, refunded, expired, or failed.
- [ ] **UX-05**: Sender can enter the dapp before registration, but sending remains gated until profile creation.
- [ ] **UX-06**: Send form remains blocked until profile registration is complete.
- [ ] **UX-07**: App opens on a main page that explains HandlePay before entering the dapp.
- [ ] **UX-08**: User can enter the dapp from the main page and access Send, Claim, Dashboard, and Profile.
- [ ] **UX-09**: MVP uses server-backed state instead of demo seed buttons or browser-only localStorage.
- [ ] **UX-10**: User can create dashboard, create tip, verify X step, connect wallet, claim, cancel, and view history through working app actions.
- [ ] **UX-11**: Profile registration starts with X/Twitter connection, derives the handle from OAuth, then captures Arc EVM wallet address through wallet connection without requiring manual handle, wallet text entry, sender visibility selection, or display name entry.
- [ ] **UX-12**: Profile registration opens as a modal from inside the dapp rather than replacing the dapp with a separate registration page.
- [ ] **UX-13**: Account creation can start from either wallet or X; reconnecting the same wallet or linked X loads the existing profile instead of creating a duplicate.
- [ ] **UX-14**: Sending remains locked until the current profile has both wallet and X linked.

### SEO / GEO

- [ ] **SEO-01**: Home page has production title, meta description, canonical URL, Open Graph, and Twitter Card metadata.
- [ ] **SEO-02**: App exposes `robots.txt` and `sitemap.xml` for production crawlability.
- [ ] **SEO-03**: Home page includes SoftwareApplication JSON-LD for AI/search extraction.
- [ ] **SEO-04**: GSD keeps a keyword, page target, and GEO answer plan in `.planning/SEO.md`.
- [ ] **SEO-05**: Future public `/@handle` pages have handle-specific title, description, and no public tip feed in v1.
- [ ] **SEO-06**: Claim pages have a production indexing decision before launch because some claim URLs may be private/status-like pages.

## v2 Requirements

- [ ] Public tipping pages for X handles.
- [ ] Multi-payment batch sends to multiple X handles.
- [ ] Merchant/payment-link mode.
- [ ] Agent wallet spending policies.
- [ ] Optional email/Telegram/GitHub identity providers.
- [ ] Arc App Kit bridge/unified balance integration.
- [ ] Fee routing and treasury dashboard.

## Out Of Scope

- X API-free scraping as the primary verification model.
- Browser extension as the primary UX.
- Custodial balances.
- Real-money mainnet launch before testnet evidence.

## Traceability

Pending roadmap mapping.
