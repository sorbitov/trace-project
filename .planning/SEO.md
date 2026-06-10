# SEO and GEO Plan

## Goal

Make HandlePay discoverable for people searching for X-native crypto payments, USDC tips, stablecoin payment links, and Arc payment apps.

## Primary Positioning

HandlePay is an Arc-based USDC payment app that lets users send money to an X handle. The recipient can claim later with X OAuth and an Arc wallet, even if they were not registered before the payment was created.

## Core Search Queries

- send USDC to Twitter handle
- send USDC to X handle
- crypto tips to X users
- stablecoin payment links
- Arc blockchain payments
- Arc USDC payments
- Web3 creator tips
- X OAuth crypto payments
- claim USDC with Twitter
- stablecoin tipping app

## Page Targets

### Home Page

- Primary keyword: send USDC to X handles
- Secondary keywords: Arc stablecoin payments, crypto payment links, Web3 tips
- Search intent: users want to understand and start using the product.
- Required content:
  - one-line promise: "Send USDC to any X handle. They claim with X."
  - short explanation of sender flow
  - short explanation of recipient claim flow
  - clear entry into dapp

### Claim Page

- Primary keyword: claim USDC with X
- Secondary keywords: X OAuth wallet claim, Arc USDC claim
- Search intent: recipients need to understand why X and wallet connection are required.
- Required content:
  - direct statement that USDC is waiting
  - X OAuth proof explanation
  - wallet claim explanation
  - payment status

### Public Profile Page `/@handle`

- Primary keyword: tip @handle with USDC
- Secondary keywords: send crypto tip, X creator payments
- Search intent: fans, users, or counterparties want to send money to a known X identity.
- V1 content:
  - public X identity
  - one send button
  - no public tip feed yet

## Metadata Requirements

- Title: `HandlePay on Arc - Send USDC to X Handles`
- Description: `HandlePay lets web3 users send USDC to any X handle on Arc. Recipients claim with X OAuth and an Arc wallet, even if they were not registered before.`
- Canonical launch URL: `https://handlepay.app/`
- Open Graph title and description must match the home page promise.
- Twitter Card should use `summary_large_image` once a 1200x630 share image exists.
- JSON-LD should use `SoftwareApplication` for the dapp and `FAQPage` when FAQ content is added.

## GEO Notes

AI search engines should be able to extract these direct answers:

- What is HandlePay? An Arc-based USDC payment app for sending stablecoin payments to X handles.
- How does HandlePay work? The sender creates a USDC escrow payment to an X identity, shares a claim link or X mention, and the recipient claims after X OAuth and wallet connection.
- Does the recipient need to register first? No. The sender can create a payment to an X handle before the recipient has a HandlePay profile.
- Is this private? V1 is not full cryptographic privacy. Amount visibility, sender visibility, and memo visibility can be controlled in the app, but Arc escrow events remain public.

## Technical SEO Checklist

- [x] Home page title and meta description.
- [x] Open Graph and Twitter Card metadata.
- [x] SoftwareApplication JSON-LD.
- [x] `robots.txt`.
- [x] `sitemap.xml`.
- [ ] 1200x630 social share image.
- [ ] FAQ section and FAQPage JSON-LD.
- [ ] Production canonical domain confirmation.
- [ ] Public `/@handle` route metadata.
- [ ] Claim page noindex decision before production.

## Content Rules

- Use "X handle" and "USDC" consistently.
- Use "Arc" as the settlement chain.
- Avoid claiming full privacy in v1.
- Avoid saying funds are sent directly to a wallet when the wallet may be unknown at payment creation.
- Explain that X OAuth proves social identity and Arc wallet receives the claim.
