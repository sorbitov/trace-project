import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";

const sessions = new Map();
const db = {
  async health() { return true; },
  async createSession(tokenHash, expiresAt) {
    sessions.set(tokenHash, { token_hash: tokenHash, profile_id: null, x_user_id: null, x_verified_at: null, expires_at: expiresAt });
  },
  async getSession(tokenHash) {
    const session = sessions.get(tokenHash);
    return session && session.expires_at > new Date() ? session : null;
  },
  async getProfile() { return null; },
  async saveOAuthState() {},
  async expirePending() {},
  async listPayments() { return []; },
};

let server;
let baseUrl;
let cookie;

before(async () => {
  server = createApp(db).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { await new Promise((resolve) => server.close(resolve)); });

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) },
  });
  if (!cookie && response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
  return response;
}

test("creates an HttpOnly session and returns scoped empty state", async () => {
  const response = await request("/api/state");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /hp_session=.*HttpOnly.*SameSite=Lax/i);
  assert.deepEqual(await response.json(), { dashboard: null, payments: [] });
});

test("publishes Arc config without exposing secrets", async () => {
  const response = await request("/api/config");
  const body = await response.json();
  assert.equal(body.chain.id, 5042002);
  assert.equal(body.chain.usdcAddress.toLowerCase(), "0x3600000000000000000000000000000000000000");
  assert.equal(JSON.stringify(body).includes("privateKey"), false);
});

test("rejects unauthenticated mutation and retires unsafe prototype routes", async () => {
  const create = await request("/api/payments", { method: "POST", body: JSON.stringify({ handle: "alice", amount: "1" }) });
  assert.equal(create.status, 403);
  const legacy = await request("/api/account/wallet", { method: "POST", body: "{}" });
  assert.equal(legacy.status, 410);
});

test("X OAuth start redirects to X or reports missing local configuration", async () => {
  const response = await request("/api/auth/x/start?return_to=%2Findex.html%23claim%3Dhp_1", { redirect: "manual" });
  assert.equal(response.status, 302);
  const location = response.headers.get("location");
  assert.ok(
    location.startsWith("https://x.com/i/oauth2/authorize?")
      || location === "/index.html?x_error=missing_x_oauth_config#claim=hp_1",
  );
});

test("static responses include security headers", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("cache-control"), /no-store/);
  const docsPage = await request("/docs.html");
  assert.equal(docsPage.status, 200);
  assert.match(await docsPage.text(), /<title>HandleLayer Project Documents \| Arc Grant &amp; Security<\/title>/);
  const grantDocument = await request("/project-docs/grant-application");
  assert.equal(grantDocument.status, 200);
  assert.match(grantDocument.headers.get("content-type"), /text\/markdown/);
  assert.match(await grantDocument.text(), /HandleLayer Grant Application/);
  const budgetDocument = await request("/project-docs/budget-and-milestones");
  assert.equal(budgetDocument.status, 200);
  assert.match(await budgetDocument.text(), /USD 75,000/);
  const statusDocument = await request("/project-docs/project-status");
  assert.equal(statusDocument.status, 200);
  assert.match(await statusDocument.text(), /Capability matrix/);
  const hackathonDocument = await request("/project-docs/hackathon-submission");
  assert.equal(hackathonDocument.status, 200);
  assert.match(await hackathonDocument.text(), /DeFi Track/);
  assert.equal((await request("/project-docs/not-public")).status, 404);
});

test("publishes structured site hierarchy and GEO discovery files", async () => {
  const home = await request("/");
  const homeHtml = await home.text();
  assert.match(homeHtml, /<link rel="canonical" href="https:\/\/handlepay\.app\/"/);
  assert.match(homeHtml, /"@type": "FAQPage"/);
  assert.match(homeHtml, /id="knowledge"/);
  assert.match(homeHtml, /aria-label="Primary navigation"/);
  assert.match(homeHtml, /role="combobox"/);
  assert.match(homeHtml, /id="recipientOptions"/);
  assert.match(homeHtml, /id="paymentConfirmModal"/);

  const docsPage = await request("/docs.html");
  const docsHtml = await docsPage.text();
  assert.match(docsHtml, /"@type": "BreadcrumbList"/);
  assert.match(docsHtml, /class="docs-nav-group"/);

  const robots = await request("/robots.txt");
  const robotsText = await robots.text();
  assert.match(robotsText, /User-agent: GPTBot/);
  assert.match(robotsText, /User-agent: ClaudeBot/);
  assert.match(robotsText, /User-agent: PerplexityBot/);

  const sitemap = await request("/sitemap.xml");
  const sitemapXml = await sitemap.text();
  assert.match(sitemapXml, /project-docs\/grant-application/);
  assert.match(sitemapXml, /project-docs\/architecture/);
  assert.match(sitemapXml, /project-docs\/security/);
});
