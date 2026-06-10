# Roadmap

## Phase 1: Product Definition

Goal: Lock the exact v1 flow, trust model, and X OAuth approach before coding.

Requirements: ID-01, ID-02, ID-03, PAY-01, UX-01, UX-02, UX-03

Success criteria:

1. User can describe the v1 flow in one sentence.
2. X OAuth approach is documented with cost and fallback assumptions.
3. Escrow vs direct-send decision is finalized.
4. Payment expiry and refund rules are chosen.

## Phase 2: Arc Escrow Contract

Goal: Build and test the onchain USDC escrow primitive.

Requirements: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, ARC-01, ARC-02, SEC-01, SEC-02, SEC-03

Success criteria:

1. Contract can create, claim, and refund payment intents.
2. Claim requires verifier signature bound to payment, wallet, chain, and expiry.
3. Contract tests cover replay, wrong wallet, wrong chain, expired signature, and refund.
4. Contract deploys to Arc Testnet.

## Phase 3: X OAuth Verifier Backend

Goal: Verify X identity offchain and issue safe claim authorizations.

Requirements: ID-03, ID-04, ID-05, ARC-04, SEC-04, SEC-05

Success criteria:

1. User can complete X OAuth.
2. Backend can verify the target X identity for a claim.
3. Backend signs claim authorization only for the connected wallet and target payment.
4. Rate limits and audit logs exist for claim attempts.

## Phase 4: Web App MVP

Goal: Ship the sender and recipient flows.

Requirements: UX-01, UX-02, UX-03, UX-04, ARC-03, PAY-06, SEO-01, SEO-02, SEO-03, SEO-04

Success criteria:

1. Sender can create and fund a payment to an X handle.
2. Sender receives a claim/status link and share copy.
3. Recipient can claim with wallet + X OAuth.
4. Sender can refund after expiry.
5. Status page reflects onchain events.
6. Home page has crawlable SEO metadata, JSON-LD, robots.txt, sitemap.xml, and a GSD SEO plan.

## Phase 5: Testnet Launch Loop

Goal: Make the product usable by early web3 testers on X.

Requirements: all v1 requirements

Success criteria:

1. End-to-end Arc Testnet demo is repeatable.
2. At least one public test campaign can send payments to X handles.
3. Operational docs explain funding, claiming, refunding, and known risks.
4. Metrics track created payments, claimed payments, refunds, and OAuth failures.
