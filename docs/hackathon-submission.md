# TRACE

## Track

**DeFi Track** — stablecoin payment infrastructure built with Arc and USDC.

## One-line pitch

Send USDC to an X identity instead of asking for a wallet address; the intended recipient proves the X account and a wallet to claim from non-custodial Arc escrow.

## Short description

TRACE is programmable social-payment infrastructure on Arc. A sender resolves an X handle to its immutable X user ID and funds a USDC escrow before the recipient has registered a wallet. The recipient opens a payment-specific link, proves the intended X account through OAuth, proves ownership of a destination wallet, and receives a short-lived claim authorization bound to the payment, wallet, chain, contract and expiry. The escrow supports claim, sender cancellation and expired refund while routing a mandatory protocol fee. PostgreSQL stores private metadata and indexed lifecycle state; the chain remains settlement authority. The contract is deployed on Arc Testnet and live low-value claim, cancellation and refund flows have been executed.

## Why this fits the DeFi Track

| Hackathon criterion | TRACE evidence |
| --- | --- |
| Effective use of Arc and USDC | Arc Testnet is the settlement layer; native USDC is the escrow asset, fee asset and gas asset. |
| Programmable money flow | Payment creation, identity-bound claim authorization, cancellation policy, expiry and refund form a conditional multi-stage flow. |
| Payment or treasury workflow | A mandatory sender fee is routed onchain to a treasury while principal remains recoverable in escrow. |
| Stablecoin infrastructure primitive | The escrow and verifier boundary can support tips, bounties, rewards and payment links addressed to offchain identities. |
| Appropriate App Kit use | Direct EVM wallet transactions are sufficient for the current escrow lifecycle. App Kit bridging or unified balance is an optional onboarding enhancement, not an invented dependency. |

## The problem

Web3 coordination happens on X, but payment still starts with a wallet-address request. This adds DM friction, address-copy risk and a registration requirement before the sender can act. A direct transfer cannot safely target someone whose wallet is not yet known.

## The solution

1. Sender enters an X handle.
2. Backend resolves the immutable X user ID.
3. Sender approves USDC and creates an Arc escrow payment.
4. A payment-specific claim link is shared with the recipient.
5. Recipient proves the intended X account and destination wallet.
6. Backend signs a short-lived, context-bound authorization.
7. Escrow transfers principal to the recipient, or the sender cancels/refunds under the selected policy.

The backend cannot mark a payment funded or settled from a client assertion alone. It verifies the Arc receipt and matching contract event.

## Arc Testnet proof

- Contract: [`0x5A3949aE67a37e7e37bFC77F5b7832Cc93f40A2a`](https://testnet.arcscan.app/address/0x5A3949aE67a37e7e37bFC77F5b7832Cc93f40A2a)
- Deployment transaction: [`0xa3f80c8e…d9c97e`](https://testnet.arcscan.app/tx/0xa3f80c8ee66e9ae22900e8b119caf391b16830f60ee921565b4ffd9cc7d9c97e)
- Chain ID: `5042002`
- USDC: `0x3600000000000000000000000000000000000000`
- Minimum protocol fee: `50` basis points
- Deployment manifest: `deployments/arc-testnet.json`

Live lifecycle evidence:

| Flow | Create transaction | Settlement transaction |
| --- | --- | --- |
| Claim, payment 1 | [`0x028c68…d48afb`](https://testnet.arcscan.app/tx/0x028c68d5eb8dea194a63717c761b1180da773d23caa8b50f856894550cd48afb) | [`0xc0fb57…a6518e`](https://testnet.arcscan.app/tx/0xc0fb573dc2631fa164b4950a278fb4168e5511ed8859476fb4bf2d5a7ca6518e) |
| Cancel, payment 2 | [`0xdff7c9…5dd16d`](https://testnet.arcscan.app/tx/0xdff7c9072c247fc9f24bced2ea4ce22ee42b4909f2b5ab63e9a2d028035dd16d) | [`0xa4cf62…89f69`](https://testnet.arcscan.app/tx/0xa4cf628afeab74c26d5de56b571d879945597b75393b5825dcd33cf092089f69) |
| Expired refund, payment 3 | [`0x7c7e21…6e9a8a`](https://testnet.arcscan.app/tx/0x7c7e219dc8909c2ff0007a1c0e1544c792a03148b2063ba12ed9fa144c6e9a8a) | [`0x3142c4…74b7e4`](https://testnet.arcscan.app/tx/0x3142c471fcfb6d8a3f5f52b464d9df98b9c28c437c3908382c2412f1de74b7e4) |

Arcscan source verification is pending explorer-verifier availability. Deployed bytecode, receipt status, USDC, verifier, treasury, owner, minimum fee and pause state were independently read through Arc RPC.

## Technical architecture

- `HandlePaymentEscrow.sol`: custody, fee routing, claim, cancellation, expired refund, pause and role rotation.
- Express API: X OAuth PKCE, immutable handle lookup, wallet challenges, scoped payment views and claim policy.
- PostgreSQL: sessions, profiles, payment intents, audit records and indexer checkpoints.
- Arc indexer: event projection and restartable checkpoints.
- Browser dapp: Arc network switching, USDC approval, escrow transactions and payment-specific claim links.

## Security properties

- Claim signatures bind chain ID, contract, payment ID, recipient wallet and authorization expiry.
- Used claim digests cannot be replayed.
- State changes happen before external token transfers and contract entry points use a reentrancy guard.
- Pause blocks create and claim but never blocks eligible sender recovery.
- Amount, sender and memo fields are omitted from unrelated API sessions.
- Funding and settlement require matching successful Arc receipts and contract events.

## Current verification

```text
37 / 37 automated tests passing
npm run check passing
npm audit: 0 known vulnerabilities
Arc Testnet claim/cancel/refund smoke passing
```

## Three-minute judge demo

1. Explain the wallet-address coordination problem and enter an X handle.
2. Show the Arc USDC approval and conditional escrow creation flow.
3. Open the exact claim link in a separate recipient session.
4. Prove X identity and wallet ownership, then claim.
5. Show privacy-scoped API data and the Arc lifecycle transactions.
6. Show cancellation and expired-refund evidence plus the automated security suite.

## Differentiation

TRACE is not a custodial social balance and not a generic payment link. The payment can be created before the recipient registers a wallet, but principal remains governed by an onchain lifecycle. Social identity establishes who may claim; wallet proof establishes where principal may move; Arc provides final settlement and recoverability.

## Truth boundary and remaining submission assets

Completed: code, tests, Arc deployment, RPC configuration verification, lifecycle smoke, architecture, security model and demo protocol.

Still required before final submission:

- public Git repository and successful CI URL;
- hosted HTTPS application and database;
- production X bearer lookup and two-account browser E2E;
- short demo video;
- team names, roles and contact details;
- final Arcscan source-verification status.
