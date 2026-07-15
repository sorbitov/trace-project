# Wallet pending request (`-32002`)

Status: resolved in local code
Date: 2026-07-14

## Symptom

In the identity modal, repeated clicks on `CONNECT` could start overlapping
`eth_requestAccounts` calls. MetaMask rejects the later call with EIP-1193 code
`-32002` while the first approval prompt is still open.

The dapp cannot cancel a request that is already pending inside the wallet. The
user must finish or reject that wallet prompt.

## Root cause and evidence

- `connectProfileWallet()` and `connectWallet()` previously called
  `requestWalletAddress()` directly on every click.
- No application state represented an in-flight wallet approval/signature flow.
- The wallet buttons therefore remained enabled until the async handler returned.
- `normalizeWalletError()` already translated `-32002` correctly, but translation
  did not prevent duplicate requests.

## Fix

- Added `createWalletRequestCoordinator()` in `app/wallet-provider.js`.
- The coordinator returns the existing promise when a wallet flow is active, so
  only one request/signature/link sequence can run at a time.
- `app/app.js` now routes both wallet-link entry points through
  `connectAndLinkWallet()`.
- Wallet buttons display `CHECK WALLET…`, expose `aria-busy="true"`, and are
  disabled for the full account-request, challenge-signature and verification
  sequence.
- Other registration actions are disabled during that sequence so navigation
  cannot abandon the active prompt accidentally.
- Cleanup is in `finally`, so approval, user rejection (`4001`) and an existing
  provider request (`-32002`) all restore an interactive UI and allow retry.

## Regression coverage

`test/wallet-provider.test.js` verifies:

1. duplicate calls share one active promise and execute the provider flow once;
2. rejection unlocks the coordinator and permits a retry;
3. `-32002` unlocks the coordinator and permits recovery after the existing
   wallet prompt is completed or rejected.

## Operational limitation

An already-pending MetaMask prompt created before this fix remains wallet-owned.
The page cannot cancel it. Complete or reject it in MetaMask once; subsequent
flows are serialized by the dapp.

## Follow-up: pending Arc network request

The same EIP-1193 `-32002` code can be returned after account access succeeds,
while MetaMask is already processing `wallet_switchEthereumChain` or
`wallet_addEthereumChain`. The original recovery only covered
`eth_requestAccounts`, so this later failure still surfaced the generic red
error.

`ensureArcChain()` now checks `eth_chainId` before requesting a switch and, when
MetaMask reports an existing network request, polls the chain until Arc Testnet
is active. The connection flow then continues automatically. Regression tests
cover both an already-selected Arc network and completion of a pending switch.
