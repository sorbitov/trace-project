# Debug session: wallet-account-authorization

Status: resolved in code; wallet confirmation still requires manual approval in the browser extension.

## Symptoms

- Flow: Connect Identity -> Wallet -> Connect.
- Expected: request account access, switch/add Arc Testnet, request a one-time ownership signature, link the wallet.
- Actual: provider error `The requested method and/or account has not been authorized by the user.`
- EIP-1193 classification: authorization failure (`4100`).

## Root cause

`requestWalletAddress()` called `ensureArcChain()` before `eth_requestAccounts`. Therefore the first wallet RPC was `wallet_switchEthereumChain`. Providers that require the origin/account permission before privileged wallet methods reject that call with `4100`, so the permission prompt was never reached.

The old order was:

1. `wallet_switchEthereumChain` (or `wallet_addEthereumChain`)
2. `eth_requestAccounts`
3. `personal_sign`

## Fix

The flow now uses the following order:

1. `eth_requestAccounts`
2. preserve the selected first account
3. `wallet_switchEthereumChain`; if the chain is unknown (`4902`), `wallet_addEthereumChain`
4. request the server challenge
5. `personal_sign(message, walletAddress)`
6. verify the signature with the server

Common provider failures are normalized:

- `4001`: explain that the request was rejected and must be approved in the wallet.
- `4100`: explain how to authorize/connect the site.
- `-32002`: explain that another wallet prompt is already open.

## Evidence and verification

- `app/wallet-provider.js` contains the isolated provider workflow and error normalization.
- `app/app.js` delegates connection and signing to that workflow.
- `test/wallet-provider.test.js` verifies call ordering, the `4902` add-chain path, error copy, and MetaMask `personal_sign` parameter order.
- `npm test`: 18/18 tests passed, including four wallet-provider regression tests.
- `npm run check`: JavaScript syntax checks and Hardhat compilation passed.
- `git diff --check` on the touched files passed (only the repository's existing CRLF conversion warnings were reported).
