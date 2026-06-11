# Phase 2 Context: Current Dapp Prototype

## Scope

Phase 2 captures what is already built in the local HandlePay prototype.

## Built So Far

- Static frontend in `app/`.
- Node API server in `server.js`.
- Local server runs on `http://127.0.0.1:4174/index.html`.
- Home page opens first.
- Dapp opens from home.
- Dapp contains Send, Claim, Dashboard, and Profile views.
- If no profile exists, the dapp is still visible but sending is gated.
- Profile registration opens as a modal inside the dapp.
- Account creation can start from wallet or X.
- First wallet connection creates or loads a wallet profile.
- First X connection creates or loads an X profile.
- If a wallet profile later connects X, the app links X to that wallet profile.
- If an X profile later connects wallet, the app links wallet to that X profile.
- Account creation does not require both wallet and X at once.
- Sending is unlocked only when one profile has both wallet and X linked.
- Registration derives handle from X OAuth session, not manual input.
- Wallet is captured through EVM wallet provider, not manual text input.
- Registration does not ask for default sender visibility; new profiles default to private and sender visibility is chosen in the send form.
- Server-backed state persists dashboard and payments in `data/state.json`.
- API routes exist for state, dashboard, payments, X connection/session, X verification, claim, and cancel.
- Send form supports handle, amount, expiry, amount visibility, sender visibility, cancel mode, platform fee, and memo.
- App generates X mention/share copy after payment creation.
- Dashboard shows sender profile and payment history.

## Known Prototype Limits

- Real X OAuth requires `X_CLIENT_ID`, optional `X_CLIENT_SECRET`, and `X_REDIRECT_URI`.
- Real Arc contract transaction submission is not connected yet.
- Local state is for prototype only; final launch checks must use full Integra/Arc stack.
- Public `/@handle` profile route is documented but not implemented as a real route yet.

## Add Future Phase 2 Work Here

Use this phase for UI/API/prototype behavior that is already inside the local app or directly extends the local app before real contracts.
