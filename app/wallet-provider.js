function providerErrorCode(error) {
  const candidates = [error, error?.cause, error?.data, error?.data?.originalError];
  for (const candidate of candidates) {
    const value = Number(candidate?.code);
    if (Number.isInteger(value)) return value;
  }
  return null;
}

export function normalizeWalletError(error, action = "wallet request") {
  const code = providerErrorCode(error);
  const rawMessage = typeof error?.message === "string" ? error.message.trim() : "";
  let message;

  if (code === 4001) {
    message = `Wallet request was rejected. Open your wallet and approve ${action}, then try again.`;
  } else if (code === 4100 || /not (?:been )?authorized|unauthorized/i.test(rawMessage)) {
    message = "This site is not authorized to use the selected wallet account. Open your wallet, connect this site, then try again.";
  } else if (code === -32002) {
    message = "A wallet request is already waiting for approval. Open the wallet extension and complete or cancel it. If no popup is visible, lock and unlock the wallet, then reload this page.";
  } else {
    message = rawMessage || `Unable to complete ${action}. Check your wallet and try again.`;
  }

  const normalized = new Error(message);
  if (code !== null) normalized.code = code;
  return normalized;
}

export function createWalletRequestCoordinator(onPendingChange = () => {}) {
  let activeRequest = null;

  return {
    get pending() {
      return activeRequest !== null;
    },
    run(request) {
      if (activeRequest) return activeRequest;

      onPendingChange(true);
      activeRequest = Promise.resolve()
        .then(request)
        .finally(() => {
          activeRequest = null;
          onPendingChange(false);
        });
      return activeRequest;
    },
  };
}

async function providerRequest(provider, request, action) {
  try {
    return await provider.request(request);
  } catch (error) {
    throw normalizeWalletError(error, action);
  }
}

export function injectedWalletProviders(ethereum) {
  if (!ethereum) return [];
  const candidates = Array.isArray(ethereum.providers) && ethereum.providers.length
    ? ethereum.providers
    : [ethereum];
  return candidates.filter((provider, index) => provider?.request && candidates.indexOf(provider) === index);
}

export async function selectInjectedWalletProvider(ethereum) {
  const providers = injectedWalletProviders(ethereum);
  if (!providers.length) return null;

  for (const provider of providers) {
    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      if (accounts?.length) return provider;
    } catch {
      // A broken provider must not prevent another installed wallet from working.
    }
  }

  return providers.find((provider) => provider.isMetaMask && !provider.isBraveWallet)
    || providers.find((provider) => provider.isCoinbaseWallet)
    || providers[0];
}

async function waitForPendingWalletAccount(provider, { timeoutMs = 60_000, pollMs = 750 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      if (accounts?.length) return accounts;
    } catch {
      // Keep waiting while the wallet extension finishes its existing request.
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw Object.assign(new Error("The wallet did not finish its pending request. In MetaMask, open Connected sites and connect 127.0.0.1:4174 manually, then try again."), { code: -32002 });
}

function chainIdsMatch(currentChainId, expectedChainId) {
  try {
    return BigInt(currentChainId) === BigInt(expectedChainId);
  } catch {
    return String(currentChainId || "").toLowerCase() === String(expectedChainId || "").toLowerCase();
  }
}

async function waitForPendingArcChain(provider, chain, { timeoutMs = 60_000, pollMs = 750 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const currentChainId = await provider.request({ method: "eth_chainId" });
      if (chainIdsMatch(currentChainId, chain.hexId)) return;
    } catch {
      // Keep waiting while the wallet owns the existing switch/add request.
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw Object.assign(new Error(`MetaMask is still waiting for the ${chain.name} network approval. Open the extension, approve or reject that request, then press Connect again.`), { code: -32002, stage: "network" });
}

export async function ensureArcChain(provider, chain, pendingOptions) {
  const currentChainId = await providerRequest(provider, { method: "eth_chainId" }, "current network lookup");
  if (chainIdsMatch(currentChainId, chain.hexId)) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.hexId }] });
  } catch (error) {
    const code = providerErrorCode(error);
    if (code === -32002) return waitForPendingArcChain(provider, chain, pendingOptions);
    if (code !== 4902) throw normalizeWalletError(error, `switching to ${chain.name}`);
    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: chain.hexId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [chain.rpcUrl],
          blockExplorerUrls: [chain.explorerUrl],
        }],
      });
    } catch (addError) {
      if (providerErrorCode(addError) === -32002) return waitForPendingArcChain(provider, chain, pendingOptions);
      throw normalizeWalletError(addError, `adding ${chain.name}`);
    }
  }
}

export async function connectWalletProvider(provider, chain, pendingOptions) {
  if (!provider?.request) {
    throw new Error("No EVM wallet was found. On mobile, open this page inside MetaMask or Coinbase Wallet; on desktop, install or enable an EVM wallet.");
  }

  // Reuse an account that already authorized this origin. This avoids opening a
  // second eth_requestAccounts prompt when the extension still owns one.
  const authorizedAccounts = await providerRequest(provider, { method: "eth_accounts" }, "connected account lookup");
  let accounts = authorizedAccounts;
  if (!accounts?.length) {
    try {
      accounts = await providerRequest(provider, { method: "eth_requestAccounts" }, "account connection");
    } catch (error) {
      if (providerErrorCode(error) !== -32002) throw error;
      accounts = await waitForPendingWalletAccount(provider, pendingOptions);
    }
  }
  const walletAddress = accounts?.[0];
  if (!walletAddress) throw new Error("No wallet account was shared. Open your wallet, connect an account, and try again.");

  await ensureArcChain(provider, chain, pendingOptions);
  return walletAddress;
}

export async function connectInjectedWallet(ethereum, chain, pendingOptions) {
  const provider = await selectInjectedWalletProvider(ethereum);
  const walletAddress = await connectWalletProvider(provider, chain, pendingOptions);
  return { provider, walletAddress };
}

export function signWalletChallenge(provider, message, walletAddress) {
  return providerRequest(provider, {
    method: "personal_sign",
    params: [message, walletAddress],
  }, "the one-time ownership signature");
}
