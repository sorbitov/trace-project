import assert from "node:assert/strict";
import test from "node:test";
import {
  connectWalletProvider,
  connectInjectedWallet,
  createWalletRequestCoordinator,
  injectedWalletProviders,
  normalizeWalletError,
  signWalletChallenge,
} from "../app/wallet-provider.js";

const chain = {
  hexId: "0x4cef52",
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
};

test("wallet connection requests account permission before switching to Arc", async () => {
  const calls = [];
  const provider = {
    async request(request) {
      calls.push(request);
      if (request.method === "eth_requestAccounts") return ["0x1234567890123456789012345678901234567890"];
      return null;
    },
  };

  const wallet = await connectWalletProvider(provider, chain);
  assert.equal(wallet, "0x1234567890123456789012345678901234567890");
  assert.deepEqual(calls.map(({ method }) => method), ["eth_accounts", "eth_requestAccounts", "eth_chainId", "wallet_switchEthereumChain"]);
});

test("unknown Arc network is added only after account permission", async () => {
  const methods = [];
  const provider = {
    async request(request) {
      methods.push(request.method);
      if (request.method === "eth_requestAccounts") return ["0x1234567890123456789012345678901234567890"];
      if (request.method === "wallet_switchEthereumChain") throw Object.assign(new Error("Unknown chain"), { code: 4902 });
      return null;
    },
  };

  await connectWalletProvider(provider, chain);
  assert.deepEqual(methods, ["eth_accounts", "eth_requestAccounts", "eth_chainId", "wallet_switchEthereumChain", "wallet_addEthereumChain"]);
});

test("already authorized account is reused without opening another approval request", async () => {
  const methods = [];
  const provider = {
    async request(request) {
      methods.push(request.method);
      if (request.method === "eth_accounts") return ["0x1234567890123456789012345678901234567890"];
      if (request.method === "eth_requestAccounts") throw new Error("duplicate account request");
      return null;
    },
  };

  const wallet = await connectWalletProvider(provider, chain);
  assert.equal(wallet, "0x1234567890123456789012345678901234567890");
  assert.deepEqual(methods, ["eth_accounts", "eth_chainId", "wallet_switchEthereumChain"]);
});

test("already selected Arc network does not open another switch request", async () => {
  const methods = [];
  const provider = {
    async request(request) {
      methods.push(request.method);
      if (request.method === "eth_accounts") return ["0x1234567890123456789012345678901234567890"];
      if (request.method === "eth_chainId") return chain.hexId;
      throw new Error("unexpected wallet request");
    },
  };

  const wallet = await connectWalletProvider(provider, chain);
  assert.equal(wallet, "0x1234567890123456789012345678901234567890");
  assert.deepEqual(methods, ["eth_accounts", "eth_chainId"]);
});

test("pending Arc network switch resumes when MetaMask completes it", async () => {
  let chainChecks = 0;
  const provider = {
    async request({ method }) {
      if (method === "eth_accounts") return ["0x1234567890123456789012345678901234567890"];
      if (method === "eth_chainId") {
        chainChecks += 1;
        return chainChecks >= 3 ? chain.hexId : "0x1";
      }
      if (method === "wallet_switchEthereumChain") throw Object.assign(new Error("Pending network approval"), { code: -32002 });
      return null;
    },
  };

  const wallet = await connectWalletProvider(provider, chain, { timeoutMs: 100, pollMs: 0 });
  assert.equal(wallet, "0x1234567890123456789012345678901234567890");
  assert.ok(chainChecks >= 3);
});

test("multi-wallet injection reuses the provider that already authorized an account", async () => {
  const pendingProvider = {
    isMetaMask: true,
    async request({ method }) {
      if (method === "eth_accounts") return [];
      if (method === "eth_requestAccounts") throw Object.assign(new Error("Pending"), { code: -32002 });
      return null;
    },
  };
  const authorizedProvider = {
    isCoinbaseWallet: true,
    async request({ method }) {
      if (method === "eth_accounts") return ["0x1234567890123456789012345678901234567890"];
      return null;
    },
  };
  const ethereum = { providers: [pendingProvider, authorizedProvider] };

  assert.deepEqual(injectedWalletProviders(ethereum), [pendingProvider, authorizedProvider]);
  const connection = await connectInjectedWallet(ethereum, chain);
  assert.equal(connection.provider, authorizedProvider);
  assert.equal(connection.walletAddress, "0x1234567890123456789012345678901234567890");
});

test("pending wallet request resumes when the extension later exposes an account", async () => {
  let accountChecks = 0;
  const provider = {
    async request({ method }) {
      if (method === "eth_accounts") {
        accountChecks += 1;
        return accountChecks >= 3 ? ["0x1234567890123456789012345678901234567890"] : [];
      }
      if (method === "eth_requestAccounts") throw Object.assign(new Error("Pending"), { code: -32002 });
      return null;
    },
  };

  const wallet = await connectWalletProvider(provider, chain, { timeoutMs: 100, pollMs: 0 });
  assert.equal(wallet, "0x1234567890123456789012345678901234567890");
  assert.ok(accountChecks >= 3);
});

test("wallet errors are converted to actionable messages", () => {
  assert.match(normalizeWalletError(Object.assign(new Error("Rejected"), { code: 4001 }), "account connection").message, /approve account connection/i);
  assert.match(normalizeWalletError(Object.assign(new Error("Unauthorized"), { code: 4100 })).message, /connect this site/i);
  assert.match(normalizeWalletError(Object.assign(new Error("Pending"), { code: -32002 })).message, /already waiting/i);
});

test("missing injected wallet gives mobile-specific guidance", async () => {
  await assert.rejects(connectWalletProvider(null, chain), /mobile.*MetaMask.*Coinbase Wallet/i);
});

test("ownership signature uses MetaMask personal_sign parameter order", async () => {
  let captured;
  const provider = { async request(request) { captured = request; return "0xsigned"; } };
  const signature = await signWalletChallenge(provider, "challenge-message", "0x1234");
  assert.equal(signature, "0xsigned");
  assert.deepEqual(captured, { method: "personal_sign", params: ["challenge-message", "0x1234"] });
});

test("wallet coordinator keeps only one approval flow active", async () => {
  const pendingStates = [];
  const coordinator = createWalletRequestCoordinator((pending) => pendingStates.push(pending));
  let completeRequest;
  let calls = 0;
  const request = () => {
    calls += 1;
    return new Promise((resolve) => { completeRequest = resolve; });
  };

  const first = coordinator.run(request);
  const duplicate = coordinator.run(request);
  assert.equal(first, duplicate);
  assert.equal(coordinator.pending, true);
  assert.equal(calls, 0);
  assert.deepEqual(pendingStates, [true]);

  await Promise.resolve();
  assert.equal(calls, 1);
  completeRequest("0x1234");
  assert.equal(await first, "0x1234");
  assert.equal(coordinator.pending, false);
  assert.deepEqual(pendingStates, [true, false]);
});

test("wallet coordinator unlocks after rejection and permits a retry", async () => {
  const pendingStates = [];
  const coordinator = createWalletRequestCoordinator((pending) => pendingStates.push(pending));
  const rejection = Object.assign(new Error("User rejected the request"), { code: 4001 });

  await assert.rejects(coordinator.run(() => Promise.reject(rejection)), { code: 4001 });
  assert.equal(coordinator.pending, false);
  assert.equal(await coordinator.run(() => Promise.resolve("retry-ok")), "retry-ok");
  assert.deepEqual(pendingStates, [true, false, true, false]);
});

test("wallet coordinator unlocks after provider reports an existing pending request", async () => {
  const coordinator = createWalletRequestCoordinator();
  const pendingError = Object.assign(new Error("Already processing eth_requestAccounts"), { code: -32002 });

  await assert.rejects(coordinator.run(() => Promise.reject(normalizeWalletError(pendingError))), { code: -32002 });
  assert.equal(coordinator.pending, false);
  assert.equal(await coordinator.run(() => Promise.resolve("recovered")), "recovered");
});
