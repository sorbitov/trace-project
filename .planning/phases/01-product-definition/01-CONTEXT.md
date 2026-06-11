# Phase 1 Context: Idea and Product Definition

## Scope

Phase 1 locks the idea, user promise, v1 product behavior, and business rules for HandlePay.

## Locked Decisions

- V1 recipient input is only an X handle, for example `@alice`.
- V1 payment type is unconditional tip/donation.
- Recipient claim flow is `X OAuth -> connect wallet -> claim`.
- Payments settle through Arc USDC escrow.
- Sender enters a handle, but backend resolves the immutable X user ID at payment creation.
- If X handle lookup fails, payment creation is blocked.
- Default payment expiry is 30 days.
- Sender can set a custom expiry.
- Sender chooses whether amount is public or private.
- Sender chooses whether sender identity is public or private.
- Tip memo/message exists in v1 and is private, visible only after recipient completes X OAuth.
- App generates a ready-to-post X mention telling recipient they have USDC waiting.
- Sender pays the platform fee.
- Platform fee is mandatory, minimum 0.5%.
- X OAuth/API cost is covered from the mandatory sender fee.
- If X OAuth is unavailable, claim waits until X OAuth works again.
- Refund/cancel is controlled by sender only.
- Sender chooses whether payment is cancellable before expiry or locked until expiry.
- After successful claim, recipient gets an optional share button.
- V1 includes a full dashboard with sent and received history.
- After X OAuth, the app creates a user profile.
- Sender sees the dapp before registration, but sending actions stay gated until profile creation.
- Profile registration starts with X/Twitter connection; the X handle is derived from OAuth, not typed manually.
- Profile registration captures the verified X identity and Arc EVM wallet address.
- Arc wallet address is captured through wallet connection, not as a primary manual text field.
- Display name is not manually entered in v1; it is derived from X identity.
- Profile registration opens as a modal from inside the dapp; after profile creation, the modal closes and sending unlocks.
- Sending is blocked until profile registration is complete.
- V1 includes public profile page `/@handle`.
- Public profile page only shows recipient identity and a send button in v1.
- Product opens on a main/home page first.
- The working dapp is entered from the home page and contains Send, Claim, History, and Profile.
- Prototype must not rely on demo seed buttons or browser-only localStorage state.
- Local development runs through an app server with API routes and persisted state.

## Deferred Ideas

- Public tips/feed on profile pages.
- Payment requests and invoices.
- Bounty/payment-for-work flows.
- Agent wallet spending policies.
- Micro SaaS checkout.
- Multi-chain routing through Arc App Kit.
- API-free X profile proof fallback.
- Telegram/GitHub/email identity providers.

## UX Notes

- The first claim screen should directly offer to receive USDC.
- The first product screen should explain the project and provide a clear entry into the dapp.
- Sender should not need to understand wallet addresses.
- Sender should see profile registration as a required setup step before entering the dapp, not as an optional afterthought.
- Registration UI should be a centered modal inside the dapp: connect X/Twitter first, connect wallet second, then create profile and unlock sending.
- Recipient should understand why X OAuth is required before wallet connection.
- Private amount/sender/memo must not be shown before X OAuth.
- X mention copy is the main viral loop.

## Technical Context For Planning

- Onchain escrow stores payment state and releases USDC only with trusted verifier authorization.
- Backend owns X OAuth, handle lookup, user ID resolution, profile creation, private metadata, and claim authorization signing.
- Frontend should start as a functional prototype with mocked OAuth/contract calls, then connect to real Arc contracts.
- Current implementation uses local API routes for dashboard, payments, X verification step, wallet claim, cancel, and persisted history.
- Real X OAuth and real Arc transaction submission remain integration work, not UI demo behavior.
- Found open-source references:
  - `dapplets/tipping-dapplet`: social-account tipping and claim-later pattern.
  - `CryptoPayLink`: payment links, dashboard, invoices, and hosted checkout patterns.
  - `PayCircle`: minimal EVM payment-link contract/frontend structure.

## Next Step

Implement a first MVP skeleton:

- product UI prototype
- Arc escrow Solidity skeleton
- mocked backend API contract for X lookup/OAuth/claim signing
- docs showing which parts are mocked vs real
