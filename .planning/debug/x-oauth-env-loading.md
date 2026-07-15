# X OAuth environment loading

Date: 2026-07-14

## Symptom

The identity modal reports that X OAuth is not configured. Both public configuration endpoints report the integration as disabled:

- `GET /api/health`: `xOAuthConfigured = false`
- `GET /api/config`: `integrations.xOAuth = false`

## Configuration path

1. `server.js` imports `src/config.js` before creating the application.
2. `src/config.js` imports `dotenv/config` and reads `process.env` once at process startup.
3. The OAuth client ID is read from `X_CLIENT_ID`, with `TWITTER_CLIENT_ID` as a legacy fallback.
4. `xOAuthConfigured()` returns true when the resulting client ID is non-empty.
5. The UI reads `/api/config` and displays the warning when `integrations.xOAuth` is false.

`X_CLIENT_SECRET` is optional for a public PKCE client. `X_REDIRECT_URI` also has a local default, so neither field controls the configured flag. The required switch is a non-empty `X_CLIENT_ID` (or its legacy alias).

## Checks performed

- Searched the complete project tree, including hidden and ignored files, for `.env*` files and X OAuth variable declarations.
- Confirmed that the project contains `.env.example` but no `.env` or `.env.local`.
- Confirmed that `X_CLIENT_ID` and `X_CLIENT_SECRET` are empty in `.env.example`; the example redirect URL is syntactically valid.
- Confirmed that the relevant variables are absent from the current shell and from Windows user/machine environment scopes.
- Confirmed that the active application is `node server.js`, started on 2026-07-14 at 14:53:45.
- Queried the live health and configuration endpoints at `127.0.0.1:4174`; both report X OAuth disabled.

No credential values were printed or recorded during these checks.

## Confirmed root cause

The running server has no X client ID available. The repository currently has no saved `.env` file, and no equivalent Windows environment variable exists. Because dotenv only reads a saved environment file when the Node process starts, values entered elsewhere or left unsaved are not available to this process.

This is not caused by `X_CLIENT_SECRET`: the implementation deliberately supports OAuth 2.0 Authorization Code with PKCE without a client secret. It is also not caused by the redirect URI, because a valid localhost callback is supplied by default.

## Required recovery

Create `E:\py_scrypt\arc_project\.env` (not `.env.example`) with at least a non-empty `X_CLIENT_ID`, optionally `X_CLIENT_SECRET`, and the exact callback approved in X:

```dotenv
X_CLIENT_ID=<saved X OAuth 2.0 client id>
X_CLIENT_SECRET=<optional for a public PKCE client>
X_REDIRECT_URI=http://127.0.0.1:4174/api/auth/x/callback
```

Then restart `node server.js`. A successful reload is verified when both `/api/health` and `/api/config` report X OAuth as enabled.

`X_BEARER_TOKEN` is separate: it enables server-side recipient lookup and is not required merely to start the user's OAuth login.
