import { config } from "./config.js";
import { normalizeHandle } from "./security.js";

async function xJson(url, options = {}, context = "X API request failed") {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.detail || body.error_description || body.title || body.error || "Unknown X API error";
    throw Object.assign(new Error(`${context}: ${message}`), { status: response.status === 429 ? 429 : 502 });
  }
  return body;
}

export function xOAuthConfigured() {
  return Boolean(config.x.clientId && config.x.clientSecret);
}

export function xLookupConfigured() {
  return Boolean(config.x.bearerToken);
}

export async function exchangeOAuthCode({ code, codeVerifier }) {
  if (!xOAuthConfigured()) throw Object.assign(new Error("X OAuth requires X_CLIENT_ID and X_CLIENT_SECRET"), { status: 503 });
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${Buffer.from(`${config.x.clientId}:${config.x.clientSecret}`).toString("base64")}`,
  };
  const token = await xJson("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers,
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.x.redirectUri,
      code_verifier: codeVerifier,
      client_id: config.x.clientId,
    }),
  }, "X token exchange failed");
  if (!token.access_token) throw Object.assign(new Error("X token exchange failed: access token is missing"), { status: 502 });
  return token.access_token;
}

export async function getAuthenticatedXUser(accessToken) {
  if (!accessToken) throw Object.assign(new Error("X identity lookup failed: access token is missing"), { status: 502 });
  const body = await xJson("https://api.x.com/2/users/me?user.fields=username,name,profile_image_url", {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, "X identity lookup failed");
  if (!body.data?.id || !normalizeHandle(body.data.username)) throw new Error("X profile response is incomplete");
  return {
    id: String(body.data.id),
    handle: normalizeHandle(body.data.username),
    displayName: body.data.name || `@${body.data.username}`,
    avatarUrl: body.data.profile_image_url || "",
  };
}

export async function resolveXUser(handleValue) {
  const handle = normalizeHandle(handleValue);
  if (!handle) throw Object.assign(new Error("Enter a valid X handle."), { status: 400 });
  if (!xLookupConfigured()) {
    throw Object.assign(new Error("X_BEARER_TOKEN is required for immutable recipient lookup."), { status: 503 });
  }
  const body = await xJson(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=username,name`,
    { headers: { Authorization: `Bearer ${config.x.bearerToken}` } },
    "X recipient lookup failed",
  );
  if (!body.data?.id) throw Object.assign(new Error("X account was not found."), { status: 404 });
  return {
    id: String(body.data.id),
    handle: normalizeHandle(body.data.username),
    displayName: body.data.name || `@${body.data.username}`,
  };
}
