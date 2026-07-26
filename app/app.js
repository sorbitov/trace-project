import { connectInjectedWallet, createWalletRequestCoordinator, signWalletChallenge } from "./wallet-provider.js?v=20260714-pending-chain";
import { identityProfiles } from "./identity-profiles.js";
import { getIdentityState } from "./identity-state.js";
import { filterRecipientProfiles, normalizeRecipientHandle, recipientInitials } from "./recipient-picker.js?v=20260714-recipient-picker";

const state = {
  config: null,
  payments: [],
  dashboard: null,
  activePaymentId: null,
  walletConnected: false,
  connectedWallet: null,
  walletProvider: null,
  registrationX: null,
  walletRequestPending: false,
};

const recipientUi = {
  filter: "all",
  activeIndex: 0,
  results: [],
  selected: null,
  recent: readStoredHandles("handlelayer_recent_recipients"),
  favorites: readStoredHandles("handlelayer_favorite_recipients"),
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function notice(message, kind = "ok") {
  const box = $("appNotice");
  box.textContent = message;
  box.className = `notice ${kind}`;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => box.classList.add("hidden"), 7000);
}

function registerNotice(message, kind = "ok") {
  const readable = {
    missing_x_oauth_config: "X OAuth keys are not configured on this server.",
    invalid_x_oauth_state: "X connection expired or was opened in another browser session.",
  };
  const box = $("registerNotice");
  box.textContent = readable[message] || message;
  box.className = `register-notice ${kind}`;
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

function normalizeHandle(value) {
  return normalizeRecipientHandle(value);
}

function readStoredHandles(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.map(normalizeRecipientHandle).filter(Boolean).slice(0, 12) : [];
  } catch { return []; }
}

function writeStoredHandles(key, handles) {
  try { window.localStorage.setItem(key, JSON.stringify(handles)); } catch { /* Storage is an optional enhancement. */ }
}

function profileForHandle(value) {
  const normalized = normalizeHandle(value);
  return identityProfiles.find(({ handle }) => handle.toLowerCase() === normalized) || null;
}

function setRecipientPickerOpen(open) {
  const picker = $("recipientPicker");
  const field = document.querySelector("[data-recipient-picker]");
  const mobileSheet = window.matchMedia("(max-width: 620px)").matches;
  if (open && mobileSheet && picker.parentElement !== document.body) document.body.append(picker);
  if ((!open || !mobileSheet) && picker.parentElement === document.body) field.append(picker);
  picker.classList.toggle("hidden", !open);
  $("handle").setAttribute("aria-expanded", String(open));
  if (!open) $("handle").removeAttribute("aria-activedescendant");
}

function updateRecipientActiveOption() {
  const options = [...$("recipientOptions").querySelectorAll('[role="option"]')];
  options.forEach((option, index) => {
    const active = index === recipientUi.activeIndex;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-selected", String(active));
  });
  const active = options[recipientUi.activeIndex];
  if (active) {
    $("handle").setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  } else {
    $("handle").removeAttribute("aria-activedescendant");
  }
}

function toggleFavoriteRecipient(handle) {
  const normalized = normalizeHandle(handle);
  const exists = recipientUi.favorites.includes(normalized);
  recipientUi.favorites = exists
    ? recipientUi.favorites.filter((item) => item !== normalized)
    : [normalized, ...recipientUi.favorites].slice(0, 24);
  writeStoredHandles("handlelayer_favorite_recipients", recipientUi.favorites);
  renderRecipientPicker();
}

function renderRecipientPicker() {
  const query = $("handle").value;
  recipientUi.results = filterRecipientProfiles(identityProfiles, {
    query,
    filter: query.trim() ? "all" : recipientUi.filter,
    recent: recipientUi.recent,
    favorites: recipientUi.favorites,
  });
  recipientUi.activeIndex = Math.min(recipientUi.activeIndex, Math.max(0, recipientUi.results.length - 1));
  document.querySelectorAll("[data-recipient-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.recipientFilter === recipientUi.filter));
  });

  const options = $("recipientOptions");
  const fragment = document.createDocumentFragment();
  recipientUi.results.forEach((profile, index) => {
    const option = document.createElement("div");
    const avatar = document.createElement("span");
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const handle = document.createElement("small");
    const group = document.createElement("em");
    const favorite = document.createElement("button");
    option.id = `recipient-option-${index}`;
    option.className = `recipient-option${profile.handle.toLowerCase() === "buildonbase" ? " is-base-anchor" : ""}`;
    option.dataset.handle = profile.handle;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    avatar.className = "recipient-monogram";
    avatar.textContent = profile.handle.toLowerCase() === "buildonbase" ? "" : recipientInitials(profile.name);
    copy.className = "recipient-option-copy";
    name.textContent = profile.name;
    handle.textContent = `@${profile.handle}`;
    group.textContent = profile.base ? `BASE / ${profile.group}` : `${profile.type.toUpperCase()} / ${profile.group}`;
    copy.append(name, handle, group);
    favorite.type = "button";
    favorite.className = "recipient-favorite";
    favorite.textContent = recipientUi.favorites.includes(profile.handle.toLowerCase()) ? "★" : "☆";
    favorite.setAttribute("aria-label", `${recipientUi.favorites.includes(profile.handle.toLowerCase()) ? "Remove" : "Add"} @${profile.handle} ${recipientUi.favorites.includes(profile.handle.toLowerCase()) ? "from" : "to"} saved recipients`);
    favorite.addEventListener("click", (event) => { event.stopPropagation(); toggleFavoriteRecipient(profile.handle); });
    option.append(avatar, copy, favorite);
    option.addEventListener("pointerenter", () => { recipientUi.activeIndex = index; updateRecipientActiveOption(); });
    option.addEventListener("click", () => selectRecipient(profile));
    fragment.append(option);
  });

  const manualHandle = normalizeHandle(query);
  if (!recipientUi.results.length && manualHandle) {
    const manual = document.createElement("div");
    manual.id = "recipient-option-manual";
    manual.className = "recipient-option recipient-option-manual";
    manual.setAttribute("role", "option");
    manual.setAttribute("aria-selected", "true");
    manual.innerHTML = `<span class="recipient-monogram">@</span><span class="recipient-option-copy"><strong>Use @${manualHandle}</strong><small>Manual X handle</small><em>IDENTITY RESOLVED BEFORE FUNDING</em></span><span class="recipient-option-arrow">↗</span>`;
    manual.addEventListener("click", () => selectRecipient({ name: `@${manualHandle}`, handle: manualHandle, group: "MANUAL X HANDLE", type: "manual" }));
    fragment.append(manual);
  }
  options.replaceChildren(fragment);
  const optionCount = options.querySelectorAll('[role="option"]').length;
  $("recipientResultsStatus").textContent = optionCount
    ? `${String(optionCount).padStart(2, "0")} MATCH${optionCount === 1 ? "" : "ES"}`
    : recipientUi.filter === "favorites" ? "NO SAVED RECIPIENTS" : recipientUi.filter === "recent" ? "NO RECENT RECIPIENTS" : "NO MATCHES";
  updateRecipientActiveOption();
}

function renderSelectedRecipient() {
  const box = $("selectedRecipient");
  const profile = recipientUi.selected;
  if (!profile) {
    box.classList.add("hidden");
    box.replaceChildren();
    return;
  }
  const avatar = document.createElement("span");
  const copy = document.createElement("span");
  const name = document.createElement("strong");
  const handle = document.createElement("small");
  const status = document.createElement("em");
  const change = document.createElement("button");
  avatar.className = `recipient-monogram${profile.handle.toLowerCase() === "buildonbase" ? " is-base-anchor" : ""}`;
  avatar.textContent = profile.handle.toLowerCase() === "buildonbase" ? "" : recipientInitials(profile.name);
  name.textContent = profile.name;
  handle.textContent = `@${profile.handle}`;
  status.textContent = profile.type === "manual" ? "VERIFY BEFORE FUNDING" : "PUBLIC X PROFILE";
  copy.append(name, handle, status);
  change.type = "button";
  change.textContent = "CHANGE";
  change.addEventListener("click", () => { setRecipientPickerOpen(true); renderRecipientPicker(); $("handle").focus(); });
  box.replaceChildren(avatar, copy, change);
  box.classList.remove("hidden");
}

function selectRecipient(profile, { fromGraph = false } = {}) {
  const normalized = normalizeHandle(profile.handle);
  if (!normalized) return;
  recipientUi.selected = { ...profile, handle: profile.handle || normalized };
  $("handle").value = profile.handle || normalized;
  recipientUi.recent = [normalized, ...recipientUi.recent.filter((item) => item !== normalized)].slice(0, 12);
  writeStoredHandles("handlelayer_recent_recipients", recipientUi.recent);
  renderSelectedRecipient();
  setRecipientPickerOpen(false);
  if (fromGraph) {
    enterDapp("send");
    requestAnimationFrame(() => {
      $("handle").focus({ preventScroll: true });
      $("handle").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    notice(`@${profile.handle} selected. Add the amount and review the route.`);
  }
}

function initializeRecipientPicker() {
  const input = $("handle");
  input.addEventListener("focus", () => { setRecipientPickerOpen(true); renderRecipientPicker(); });
  input.addEventListener("input", () => {
    recipientUi.selected = null;
    renderSelectedRecipient();
    recipientUi.activeIndex = 0;
    setRecipientPickerOpen(true);
    renderRecipientPicker();
  });
  input.addEventListener("keydown", (event) => {
    const pickerOpen = !$("recipientPicker").classList.contains("hidden");
    const optionCount = $("recipientOptions").querySelectorAll('[role="option"]').length;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!pickerOpen) { setRecipientPickerOpen(true); renderRecipientPicker(); return; }
      recipientUi.activeIndex = (recipientUi.activeIndex + (event.key === "ArrowDown" ? 1 : -1) + optionCount) % Math.max(optionCount, 1);
      updateRecipientActiveOption();
    } else if (event.key === "Enter" && pickerOpen && optionCount) {
      event.preventDefault();
      $("recipientOptions").querySelectorAll('[role="option"]')[recipientUi.activeIndex]?.click();
    } else if (event.key === "Escape") {
      setRecipientPickerOpen(false);
    } else if (event.key === "Tab") {
      setRecipientPickerOpen(false);
    }
  });
  document.querySelectorAll("[data-recipient-filter]").forEach((button) => button.addEventListener("click", () => {
    recipientUi.filter = button.dataset.recipientFilter;
    recipientUi.activeIndex = 0;
    renderRecipientPicker();
  }));
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("[data-recipient-picker], #recipientPicker")) setRecipientPickerOpen(false);
  });
  window.addEventListener("resize", () => {
    if ($("handle").getAttribute("aria-expanded") === "true") setRecipientPickerOpen(true);
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      enterDapp("send");
      input.focus();
      setRecipientPickerOpen(true);
      renderRecipientPicker();
    }
  });
}

function getExpiryDays() {
  return $("expiry").value === "custom" ? Number($("customExpiry").value) : Number($("expiry").value);
}

function getFeePct() {
  const raw = $("feePreset").value === "custom" ? Number($("customFee").value) : Number($("feePreset").value);
  return Math.max(0.5, raw || 0.5);
}

function formatUsdc(value) {
  return value == null ? "USDC amount hidden" : `${Number(value).toFixed(2)} USDC`;
}

function renderWalletButton(id, disabled, label) {
  const button = $(id);
  button.disabled = disabled || state.walletRequestPending;
  button.textContent = state.walletRequestPending ? "CHECK WALLET\u2026" : label;
  if (state.walletRequestPending) button.setAttribute("aria-busy", "true");
  else button.removeAttribute("aria-busy");
}

function activePayment() {
  return state.payments.find((payment) => payment.id === state.activePaymentId) || state.payments[0] || null;
}

function mergePayment(payment) {
  const index = state.payments.findIndex((item) => item.id === payment.id);
  if (index >= 0) state.payments[index] = payment;
  else state.payments.unshift(payment);
  state.activePaymentId = payment.id;
}

function setServerState(nextState) {
  state.dashboard = nextState.dashboard || null;
  state.payments = nextState.payments || [];
  if (!state.activePaymentId && state.payments[0]) state.activePaymentId = state.payments[0].id;
}

function accountCanSend(profile = state.dashboard) {
  return getIdentityState(profile).ready && Boolean(profile?.handle);
}

function claimIdFromLocation() {
  const match = window.location.hash.match(/^#claim=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function loadState() {
  const [configuration, nextState] = await Promise.all([api("/api/config"), api("/api/state")]);
  state.config = configuration;
  setServerState(nextState);
  await loadXSession();

  const claimId = claimIdFromLocation();
  if (claimId) {
    const { payment } = await api(`/api/payments/${encodeURIComponent(claimId)}`);
    mergePayment(payment);
  }
  renderAll();

  const params = new URLSearchParams(window.location.search);
  const xConnectedReturn = params.has("x");
  let xError = params.get("x_error");
  if (xError === "missing_x_oauth_config" && state.config?.integrations?.xOAuth) {
    params.delete("x_error");
    const cleanQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`);
    xError = null;
  }
  if (xError) {
    registerNotice(decodeURIComponent(xError), "error");
    params.delete("x_error");
    const cleanQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`);
  }
  if (xConnectedReturn) {
    params.delete("x");
    const cleanQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`);
  }
  if (claimId) enterDapp("claim");
  else if (xConnectedReturn) {
    enterDapp(getIdentityState(state.dashboard).nextView);
    notice(accountCanSend() ? "Identity complete. USDC sending is unlocked." : "X verified. Connect an Arc wallet holding USDC to unlock sending.");
  }
  else if (xError) showRegister();
  else if (state.dashboard) enterDapp(getIdentityState(state.dashboard).nextView);
  else showHome();
}

function enterDapp(view = "send") {
  $("homeScreen").classList.add("hidden");
  $("registerScreen").classList.add("hidden");
  $("dappShell").classList.remove("hidden");
  setView(view);
}

function showHome() {
  closeProfileModal();
  $("dappShell").classList.add("hidden");
  $("registerScreen").classList.add("hidden");
  $("homeScreen").classList.remove("hidden");
}

function showRegister() {
  $("homeScreen").classList.add("hidden");
  $("registerScreen").classList.add("hidden");
  $("dappShell").classList.remove("hidden");
  openProfileModal();
}

function openProfileModal() {
  $("profileModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  renderRegistration();
}

function closeProfileModal() {
  $("profileModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function updateQuote() {
  const amount = Number($("amount").value || 0);
  const fee = amount * (getFeePct() / 100);
  $("totalDue").textContent = formatUsdc(amount + fee);
  $("feeLine").textContent = `Includes ${fee.toFixed(2)} USDC protocol fee.`;
}

function renderLatest() {
  const payment = activePayment();
  const box = $("latestPayment");
  if (!payment) {
    const identity = getIdentityState(state.dashboard);
    box.className = `empty-state payment-zero ${identity.hasIdentity ? "has-identity" : ""} ${identity.ready ? "is-ready" : ""}`;
    box.innerHTML = `
      <div class="empty-route-visual" aria-hidden="true"><span>IDENTITY</span><i></i><span>ESCROW</span><i></i><span>RECEIPT</span></div>
      <div class="empty-receipt-copy">
        <small>RECEIPT SLOT / 00</small>
        <strong>FIRST PAYMENT<br />STARTS HERE.</strong>
        <p>Claim link, amount, expiry and settlement state will appear in this panel.</p>
      </div>
      <button class="ghost-button empty-payment-action" type="button" data-empty-payment-action>${identity.ready ? "CREATE FIRST PAYMENT" : "COMPLETE IDENTITY"} ↗</button>
    `;
    return;
  }
  let action = "";
  if (payment.canCancel) action = `<button class="ghost-button" data-payment-action="cancel" data-payment-id="${payment.id}">Cancel on Arc</button>`;
  else if (payment.canRefund) action = `<button class="ghost-button" data-payment-action="refund" data-payment-id="${payment.id}">Refund on Arc</button>`;
  box.className = "receipt";
  box.innerHTML = `
    <strong>@${payment.handle}</strong>
    <span>${payment.amountLabel} · ${payment.status}</span>
    <span>${payment.expiryDays} day expiry</span>
    <code>${payment.claimUrl}</code>
    ${payment.shareText ? `<div class="copybox"><small>X post copy</small><span>${payment.shareText}</span></div>` : ""}
    ${action}
  `;
}

function renderClaim() {
  const payment = activePayment();
  const box = $("claimPreview");
  if (!payment) {
    box.innerHTML = "<strong>No active tip.</strong><p>Open a valid claim link.</p>";
    $("verifyX").disabled = true;
    renderWalletButton("connectWallet", true, "CONNECT WALLET");
    $("claimPayment").disabled = true;
    $("walletClaimWrap").classList.add("hidden");
    return;
  }
  box.innerHTML = `
    <p class="eyebrow">For @${payment.handle}</p>
    <h2>${payment.amountLabel}</h2>
    <p>${payment.memoLabel}</p>
    <span class="status">${payment.status}</span>
  `;
  const pending = payment.status === "pending";
  $("verifyX").disabled = !pending || payment.isRecipient;
  $("verifyX").textContent = payment.isRecipient ? "X verified" : "Continue with X";
  renderWalletButton("connectWallet", !pending || !payment.isRecipient, "CONNECT WALLET");
  $("claimPayment").disabled = !pending || !payment.isRecipient || !state.walletConnected;
  $("walletClaimWrap").classList.toggle("hidden", !payment.isRecipient);
}

function renderHistory() {
  $("historyCount").textContent = state.dashboard ? `${state.payments.length} payments` : "not connected";
  const profile = $("dashboardProfile");
  if (!state.dashboard) {
    profile.innerHTML = '<div class="empty-state">Connect wallet or X to create an account.</div>';
  } else {
    profile.innerHTML = `<div class="profile-summary-card">
      <strong>${state.dashboard.handle ? `@${state.dashboard.handle}` : "X not linked"}</strong>
      <span>${state.dashboard.walletAddress || "Wallet not linked"}</span>
      <small>${accountCanSend() ? "Ready for Arc escrow" : "Connect both wallet and X to send"}</small>
    </div>`;
  }
  const list = $("history");
  if (!state.payments.length) {
    list.innerHTML = '<div class="empty-state">No sent or received tips yet.</div>';
    return;
  }
  list.innerHTML = state.payments.map((payment) => `<article class="history-item" data-payment-id="${payment.id}">
    <div><strong>@${payment.handle}</strong><p>${payment.amountLabel} | ${payment.status}</p></div>
    <span class="status">${payment.status}</span>
  </article>`).join("");
}

function renderProfileSettings() {
  const profile = $("profileAccount");
  const identity = getIdentityState(state.dashboard);
  if (!state.dashboard) {
    profile.innerHTML = '<div class="empty-state">Connect wallet or X to create an account.</div>';
  } else {
    profile.innerHTML = `<div class="profile-summary-card account-summary">
      <article class="account-identity ${identity.xConnected ? "connected" : "missing"}">
        <span>01 / X IDENTITY</span>
        <strong>${state.dashboard.handle ? `@${state.dashboard.handle}` : "NOT CONNECTED"}</strong>
        <small>${identity.xConnected ? "OAuth verified" : "Connect X to prove the social identity"}</small>
      </article>
      <article class="account-identity ${identity.walletConnected ? "connected" : "missing"}">
        <span>02 / ARC WALLET</span>
        <strong>${identity.walletConnected ? shortAddress(state.dashboard.walletAddress) : "NOT CONNECTED"}</strong>
        <small>${identity.walletConnected ? "Ownership verified" : "Connect the wallet that will hold and send USDC"}</small>
      </article>
      <div class="account-readiness ${identity.ready ? "ready" : "partial"}">
        <span>${identity.ready ? "READY" : "ONE MORE STEP"}</span>
        <strong>${identity.ready ? "USDC sending unlocked" : identity.missing === "wallet" ? "Add an Arc wallet with USDC" : "Add your verified X account"}</strong>
      </div>
    </div>`;
  }
  renderWalletButton("profileConnectWallet", identity.walletConnected, identity.walletConnected ? "WALLET CONNECTED" : "CONNECT WALLET");
  $("profileConnectX").disabled = identity.xConnected || state.walletRequestPending;
  $("profileConnectX").textContent = identity.xConnected ? "X CONNECTED" : "CONNECT X";
}

function renderDashboardGate() {
  const identity = getIdentityState(state.dashboard);
  $("sendGate").classList.toggle("hidden", identity.ready);
  const walletReady = identity.walletConnected;
  const xReady = identity.xConnected;
  $("gateWalletStatus").textContent = walletReady ? "Wallet ready" : "Wallet";
  $("gateXStatus").textContent = xReady ? "X ready" : "X account";
  $("gateWalletStatus").classList.toggle("connected", walletReady);
  $("gateXStatus").classList.toggle("connected", xReady);
  $("sendGateTitle").textContent = identity.missing === "wallet" ? "ARC WALLET REQUIRED" : identity.missing === "x" ? "X IDENTITY REQUIRED" : "IDENTITY REQUIRED";
  $("sendGateText").textContent = identity.missing === "wallet"
    ? "X is verified. Connect the Arc wallet that will fund USDC."
    : identity.missing === "x"
      ? "Wallet ownership is verified. Connect X before sending."
      : "Start with X or wallet; connect both before funding escrow.";
  $("sendGateAction").textContent = identity.missing === "wallet" ? "CONNECT WALLET ↗" : identity.missing === "x" ? "CONNECT X ↗" : "START SETUP ↗";
  $("sendForm").classList.toggle("form-disabled", !identity.ready);
  $("sendForm").querySelector('button[type="submit"]').disabled = !identity.ready;
}

function renderRegistration() {
  const identity = getIdentityState(state.dashboard);
  const xConnected = identity.xConnected || Boolean(state.registrationX);
  const walletConnected = identity.walletConnected;
  const walletAvailable = Boolean(window.ethereum?.request);
  const hasAccount = xConnected || walletConnected;
  $("xIdentity").innerHTML = xConnected
    ? `<strong>${state.dashboard?.handle ? `@${state.dashboard.handle}` : state.registrationX?.displayName}</strong><small>OAuth verified</small>`
    : "<strong>X account</strong><small>Required for identity</small>";
  $("walletIdentity").innerHTML = walletConnected
    ? `<strong>${shortAddress(state.dashboard.walletAddress)}</strong><small>Ownership verified</small>`
    : walletAvailable
      ? "<strong>Wallet</strong><small>Connect and sign once</small>"
      : "<strong>Wallet</strong><small>On mobile, open in a wallet browser</small>";
  $("connectXProfile").disabled = xConnected || state.walletRequestPending;
  renderWalletButton("connectProfileWallet", walletConnected, "CONNECT");
  $("createProfile").disabled = !hasAccount || state.walletRequestPending;
  $("profileModalLead").textContent = identity.ready
    ? "Identity complete. Payments are ready."
    : xConnected
      ? "X verified. Add the Arc wallet that will send and receive USDC."
      : walletConnected
        ? "Wallet verified. Add X before sending payments."
        : "Start with either X or wallet. Both are required to send.";
  $("createProfile").textContent = identity.ready ? "START SENDING ↗" : hasAccount ? "CONTINUE TO ACCOUNT ↗" : "CONNECT X OR WALLET";
}

function renderAll() {
  updateQuote();
  renderDashboardGate();
  renderRegistration();
  renderLatest();
  renderClaim();
  renderHistory();
  renderProfileSettings();
}

function setView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === id));
}

async function requestWalletAddress() {
  const connection = await connectInjectedWallet(window.ethereum, state.config.chain);
  state.walletProvider = connection.provider;
  return connection.walletAddress;
}

async function verifyAndLinkWallet(walletAddress) {
  const challenge = await api("/api/auth/wallet/challenge", {
    method: "POST", body: JSON.stringify({ walletAddress }),
  });
  const signature = await signWalletChallenge(state.walletProvider || window.ethereum, challenge.message, walletAddress);
  await api("/api/auth/wallet/verify", {
    method: "POST", body: JSON.stringify({ nonce: challenge.nonce, signature }),
  });
  const nextState = await api("/api/state");
  setServerState(nextState);
  state.connectedWallet = walletAddress;
  return walletAddress;
}

const walletConnection = createWalletRequestCoordinator((pending) => {
  state.walletRequestPending = pending;
  renderAll();
});

function connectAndLinkWallet() {
  return walletConnection.run(async () => {
    const walletAddress = await requestWalletAddress();
    await verifyAndLinkWallet(walletAddress);
    return walletAddress;
  });
}

async function sendArcTransaction(transaction, from) {
  const provider = state.walletProvider || window.ethereum;
  const hash = await provider.request({ method: "eth_sendTransaction", params: [{ ...transaction, from }] });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [hash] });
    if (receipt) {
      if (Number(receipt.status) !== 1) throw new Error(`Arc transaction reverted: ${hash}`);
      return hash;
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
  throw new Error(`Transaction is still pending: ${hash}`);
}

function closePaymentConfirmation() {
  $("paymentConfirmModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function openPaymentConfirmation(event) {
  event.preventDefault();
  const handle = normalizeHandle($("handle").value);
  const amount = Number($("amount").value);
  if (!handle) {
    notice("Enter a valid X handle or paste an x.com profile link.", "error");
    $("handle").focus();
    setRecipientPickerOpen(true);
    renderRecipientPicker();
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    notice("Enter a valid USDC amount.", "error");
    $("amount").focus();
    return;
  }
  if (!accountCanSend()) {
    showRegister();
    return;
  }
  const profile = profileForHandle(handle) || { name: `@${handle}`, handle, group: "MANUAL X HANDLE", type: "manual" };
  selectRecipient(profile);
  const avatar = $("confirmRecipientAvatar");
  avatar.className = `recipient-monogram${handle === "buildonbase" ? " is-base-anchor" : ""}`;
  avatar.textContent = handle === "buildonbase" ? "" : recipientInitials(profile.name);
  $("confirmRecipientName").textContent = profile.name;
  $("confirmRecipientHandle").textContent = `@${profile.handle}`;
  $("confirmAmount").textContent = `${amount.toFixed(2)} USDC`;
  $("confirmExpiry").textContent = `${getExpiryDays()} DAYS`;
  $("paymentConfirmModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  $("confirmPayment").focus();
}

async function createPayment() {
  const confirmButton = $("confirmPayment");
  confirmButton.disabled = true;
  confirmButton.textContent = "CHECK WALLET…";
  closePaymentConfirmation();
  try {
    const wallet = await requestWalletAddress();
    if (wallet.toLowerCase() !== state.dashboard.walletAddress.toLowerCase()) throw new Error("Switch to the wallet linked to this profile.");
    notice("Resolving X identity and preparing Arc escrow…");
    const intent = await api("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        handle: normalizeHandle($("handle").value), amount: $("amount").value, feePct: getFeePct(),
        expiryDays: getExpiryDays(), amountVisibility: $("amountVisibility").value,
        senderVisibility: $("senderVisibility").value, cancelMode: $("cancelMode").value, memo: $("memo").value.trim(),
      }),
    });
    mergePayment(intent.payment);
    notice("Approve USDC spending in your wallet…");
    await sendArcTransaction(intent.transactions.approve, wallet);
    notice("Create the escrow payment in your wallet…");
    const fundingHash = await sendArcTransaction(intent.transactions.create, wallet);
    const confirmed = await api(`/api/payments/${intent.payment.id}/funding`, {
      method: "POST", body: JSON.stringify({ transactionHash: fundingHash }),
    });
    mergePayment(confirmed.payment);
    const nextState = await api("/api/state");
    setServerState(nextState);
    state.activePaymentId = intent.payment.id;
    renderAll();
    notice("USDC is locked in Arc escrow. Share the claim link with the recipient.");
  } catch (error) { notice(error.message, "error"); }
  finally {
    confirmButton.disabled = false;
    confirmButton.textContent = "CONFIRM & FUND ↗";
  }
}

function registerProfile(event) {
  event.preventDefault();
  if (!state.dashboard) return registerNotice("Connect wallet or X first.", "error");
  closeProfileModal();
  enterDapp(getIdentityState(state.dashboard).nextView);
  notice(accountCanSend() ? "Identity complete. Arc escrow sending is unlocked." : "Partial account saved. Connect the missing identity to send USDC.");
}

function currentReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

async function xOAuthAvailable(messageTarget = "register") {
  if (state.config?.integrations?.xOAuth) return true;
  try {
    state.config = await api("/api/config");
    if (state.config?.integrations?.xOAuth) return true;
  } catch {
    // The actionable configuration message below is clearer than a fetch error here.
  }
  const message = "X OAuth is incomplete. Add the full X_CLIENT_SECRET to .env, save the file, and restart the server.";
  if (messageTarget === "app") notice(message, "error");
  else registerNotice(message, "error");
  return false;
}

async function connectXForRegistration() {
  if (!(await xOAuthAvailable($("profileModal").classList.contains("hidden") ? "app" : "register"))) return;
  window.location.href = `/api/auth/x/start?return_to=${encodeURIComponent(currentReturnTo())}`;
}

async function loadXSession() {
  const result = await api("/api/auth/x/session");
  state.registrationX = result.connected ? result.profile : null;
}

async function connectProfileWallet() {
  try {
    const wallet = await connectAndLinkWallet();
    renderAll();
    closeProfileModal();
    enterDapp(getIdentityState(state.dashboard).nextView);
    notice(accountCanSend() ? `Wallet verified: ${shortAddress(wallet)}. Sending unlocked.` : `Wallet verified: ${shortAddress(wallet)}. Connect X to unlock sending.`);
  } catch (error) { registerNotice(error.message, "error"); }
}

async function verifyX() {
  const payment = activePayment();
  if (!payment) return;
  if (!(await xOAuthAvailable("app"))) return;
  window.location.href = `/api/auth/x/start?return_to=${encodeURIComponent(`/index.html#claim=${payment.id}`)}`;
}

async function connectWallet() {
  try {
    const wallet = await connectAndLinkWallet();
    state.walletConnected = true;
    $("claimWallet").value = wallet;
    const { payment } = await api(`/api/payments/${activePayment().id}`);
    mergePayment(payment);
    renderAll();
    notice("Claim wallet ownership verified.");
  } catch (error) { notice(error.message, "error"); }
}

async function claimPayment() {
  const payment = activePayment();
  try {
    const walletAddress = state.connectedWallet || $("claimWallet").value.trim();
    const authorization = await api(`/api/payments/${payment.id}/claim-authorization`, {
      method: "POST", body: JSON.stringify({ walletAddress }),
    });
    const hash = await sendArcTransaction(authorization.transaction, walletAddress);
    const result = await api(`/api/payments/${payment.id}/settlement`, {
      method: "POST", body: JSON.stringify({ transactionHash: hash }),
    });
    mergePayment(result.payment);
    state.walletConnected = false;
    renderAll();
    notice("USDC claimed on Arc.");
  } catch (error) { notice(error.message, "error"); }
}

async function settlePayment(paymentId, action) {
  try {
    const wallet = await requestWalletAddress();
    if (wallet.toLowerCase() !== state.dashboard.walletAddress.toLowerCase()) throw new Error("Switch to the sender wallet.");
    const { transaction } = await api(`/api/payments/${paymentId}/${action}`, { method: "POST" });
    const hash = await sendArcTransaction(transaction, wallet);
    const result = await api(`/api/payments/${paymentId}/settlement`, {
      method: "POST", body: JSON.stringify({ transactionHash: hash }),
    });
    mergePayment(result.payment);
    renderAll();
    notice(action === "refund" ? "Expired payment refunded on Arc." : "Payment cancelled and refunded on Arc.");
  } catch (error) { notice(error.message, "error"); }
}

function initIdentityField() {
  const stage = document.querySelector("[data-identity-stage]");
  if (!stage) return;
  const field = stage.querySelector("[data-identity-field]");
  const fragment = document.createDocumentFragment();
  const columns = 16;
  const rows = Math.ceil(identityProfiles.length / columns);

  function initials(name) {
    return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }

  identityProfiles.forEach((profile, index) => {
    const slot = (index * 53) % identityProfiles.length;
    const column = slot % columns;
    const row = Math.floor(slot / columns);
    const jitterX = ((index * 29) % 11 - 5) * .28;
    const jitterY = ((index * 17) % 9 - 4) * .34;
    const isAnchor = profile.handle.toLowerCase() === "buildonbase";
    let x = 3.6 + column * (92.8 / (columns - 1)) + jitterX;
    let y = 7 + row * (86 / Math.max(1, rows - 1)) + jitterY;
    if (isAnchor) {
      x = 50;
      y = 50;
    } else {
      const centerX = x - 50;
      const centerY = y - 50;
      const centerDistance = Math.hypot(centerX, centerY);
      if (centerDistance < 12) {
        const scale = 12 / Math.max(centerDistance, 1);
        x = 50 + centerX * scale;
        y = 50 + centerY * scale;
      }
    }
    const element = document.createElement("a");
    const avatar = document.createElement("span");
    const card = document.createElement("span");
    const name = document.createElement("strong");
    const handle = document.createElement("small");
    const group = document.createElement("em");
    element.className = `identity-node${x > 76 ? " card-left" : ""}${profile.base ? " is-base" : ""}${isAnchor ? " is-anchor" : ""}`;
    element.dataset.x = x.toFixed(2);
    element.dataset.y = y.toFixed(2);
    element.href = `https://x.com/${profile.handle}`;
    element.target = "_blank";
    element.rel = "noreferrer";
    element.setAttribute("aria-label", `${profile.name} on X`);
    element.title = `Select @${profile.handle} as recipient. Ctrl/Cmd-click opens X.`;
    element.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      selectRecipient(profile, { fromGraph: true });
    });
    avatar.className = "identity-avatar";
    avatar.textContent = initials(profile.name);
    card.className = "identity-card";
    name.textContent = profile.name;
    handle.textContent = `@${profile.handle}`;
    group.textContent = profile.group;
    card.append(name, handle, group);
    element.append(avatar, card);
    fragment.append(element);
  });
  field.replaceChildren(fragment);
  const count = stage.querySelector("[data-identity-count]");
  // Media queries hide nodes past a breakpoint-specific index (16 / 30 / 60), so
  // the array length overstates what is on screen. Count what actually renders.
  function updateCount() {
    if (!count) return;
    const visible = [...field.children].filter((node) => node.offsetParent !== null).length;
    count.textContent = `${visible} CRYPTO ROUTES`;
  }
  updateCount();

  const nodes = [...stage.querySelectorAll(".identity-node")].map((element, index) => {
    const x = Number(element.dataset.x);
    const y = Number(element.dataset.y);
    const avatar = element.querySelector(".identity-avatar");
    const fallback = avatar.textContent.trim();
    const fallbackNode = document.createElement("b");
    const avatarImage = document.createElement("img");
    fallbackNode.textContent = fallback;
    avatar.replaceChildren(fallbackNode);
    element.style.setProperty("--x", `${x}%`);
    element.style.setProperty("--y", `${y}%`);
    element.style.setProperty("--delay", `${(-.7 - index * .47).toFixed(2)}s`);
    element.dataset.avatarState = "fallback";
    return {
      element,
      avatar,
      x,
      y,
      reveal: 0,
      avatarImage,
      avatarState: "idle",
      avatarUrl: `/avatars/x/${encodeURIComponent(new URL(element.href).pathname.slice(1))}`,
    };
  });

  function loadAvatar(node) {
    if (node.avatarState !== "idle") return;
    node.avatarState = "loading";
    node.element.dataset.avatarState = "loading";
    node.avatarImage.alt = "";
    node.avatarImage.decoding = "async";
    node.avatarImage.referrerPolicy = "no-referrer";
    node.avatarImage.addEventListener("load", () => {
      if (node.avatarImage.naturalWidth < 4 || node.avatarImage.naturalHeight < 4) {
        node.avatarState = "fallback";
        node.element.dataset.avatarState = "fallback";
        return;
      }
      node.avatarState = "loaded";
      node.element.dataset.avatarState = "loaded";
      node.avatar.append(node.avatarImage);
      requestAnimationFrame(() => node.avatarImage.classList.add("is-loaded"));
    }, { once: true });
    node.avatarImage.addEventListener("error", () => {
      node.avatarState = "fallback";
      node.element.dataset.avatarState = "fallback";
    }, { once: true });
    node.avatarImage.src = node.avatarUrl;
  }

  const anchorNode = nodes.find(({ element }) => element.classList.contains("is-anchor"));
  if (anchorNode) loadAvatar(anchorNode);
  // Avatars now come from our own cached proxy, so every node can load up front
  // instead of waiting for a hover. The proxy throttles the upstream fetches.
  nodes.forEach(loadAvatar);
  function setNodeReveal(node, reveal, pointerX = null, pointerY = null, showCard = false) {
    const eased = Math.pow(Math.max(0, Math.min(1, reveal)), .52);
    node.reveal = eased;
    let pushX = 0;
    let pushY = 0;
    if (pointerX !== null && pointerY !== null && eased > 0) {
      const dx = pointerX - node.pixelX;
      const dy = pointerY - node.pixelY;
      const distance = Math.hypot(dx, dy) || 1;
      pushX = (dx / distance) * eased * 7;
      pushY = (dy / distance) * eased * 7;
    }
    node.element.style.setProperty("--reveal", eased.toFixed(3));
    node.element.style.setProperty("--node-opacity", (.46 + eased * .54).toFixed(3));
    node.element.style.setProperty("--node-scale", (.74 + eased * .26).toFixed(3));
    node.element.style.setProperty("--node-blur", `${((1 - eased) * .7).toFixed(2)}px`);
    node.element.style.setProperty("--card-opacity", showCard ? Math.max(0, Math.min(1, (eased - .26) / .5)).toFixed(3) : "0");
    node.element.style.setProperty("--glow-size", `${(5 + eased * 23).toFixed(1)}px`);
    node.element.style.setProperty("--push-x", `${pushX.toFixed(1)}px`);
    node.element.style.setProperty("--push-y", `${pushY.toFixed(1)}px`);
    node.element.classList.toggle("is-revealed", eased > .36);
    node.element.classList.toggle("shows-card", showCard && eased > .42);
    node.element.style.zIndex = showCard && eased > .42 ? "10" : eased > .7 ? "7" : "4";
    if (showCard && eased > .42) loadAvatar(node);
  }

  function resetField() {
    stage.classList.remove("is-active");
    nodes.forEach((node) => {
      const isFocused = document.activeElement === node.element;
      const baseline = node.element.classList.contains("is-anchor") ? .74 : 0;
      setNodeReveal(node, isFocused ? 1 : baseline, null, null, isFocused);
    });
  }

  function revealAt(event) {
    const rect = stage.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const radius = Math.max(145, Math.min(235, rect.width * .2));
    stage.classList.add("is-active");
    stage.style.setProperty("--pointer-x", `${pointerX}px`);
    stage.style.setProperty("--pointer-y", `${pointerY}px`);
    const distances = nodes.map((node) => {
      node.pixelX = rect.width * node.x / 100;
      node.pixelY = rect.height * node.y / 100;
      return { node, distance: Math.hypot(pointerX - node.pixelX, pointerY - node.pixelY) };
    });
    const nearest = distances.reduce((best, entry) => entry.distance < best.distance ? entry : best, distances[0]);
    distances.forEach(({ node, distance }) => setNodeReveal(node, 1 - distance / radius, pointerX, pointerY, node === nearest.node));
  }

  stage.addEventListener("pointermove", revealAt);
  stage.addEventListener("pointerleave", resetField);
  stage.addEventListener("focusin", (event) => {
    const node = nodes.find(({ element }) => element === event.target);
    if (node) setNodeReveal(node, 1, null, null, true);
  });
  stage.addEventListener("focusout", () => requestAnimationFrame(resetField));
  let countTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(countTimer);
    countTimer = setTimeout(updateCount, 150);
  });
  resetField();
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelectorAll("[data-enter-dapp]").forEach((button) => button.addEventListener("click", () => enterDapp("send")));
document.querySelectorAll("[data-enter-dapp-dashboard]").forEach((button) => button.addEventListener("click", showRegister));
document.querySelectorAll("[data-register-profile]").forEach((button) => button.addEventListener("click", showRegister));
document.querySelectorAll("[data-home]").forEach((button) => button.addEventListener("click", showHome));
document.querySelectorAll("[data-close-profile-modal]").forEach((button) => button.addEventListener("click", closeProfileModal));
document.querySelectorAll("[data-close-payment-confirm]").forEach((button) => button.addEventListener("click", closePaymentConfirmation));
document.querySelectorAll("[data-view-jump]").forEach((button) => button.addEventListener("click", () => enterDapp(button.dataset.viewJump)));

$("expiry").addEventListener("change", () => { $("customExpiryWrap").classList.toggle("hidden", $("expiry").value !== "custom"); renderAll(); });
$("feePreset").addEventListener("change", () => { $("customFeeWrap").classList.toggle("hidden", $("feePreset").value !== "custom"); renderAll(); });
["amount", "customExpiry", "customFee"].forEach((id) => $(id).addEventListener("input", renderAll));
$("sendForm").addEventListener("submit", openPaymentConfirmation);
$("confirmPayment").addEventListener("click", createPayment);
$("profileForm").addEventListener("submit", registerProfile);
$("connectXProfile").addEventListener("click", connectXForRegistration);
$("connectProfileWallet").addEventListener("click", connectProfileWallet);
$("profileConnectX").addEventListener("click", connectXForRegistration);
$("profileConnectWallet").addEventListener("click", connectProfileWallet);
$("verifyX").addEventListener("click", verifyX);
$("connectWallet").addEventListener("click", connectWallet);
$("claimPayment").addEventListener("click", claimPayment);

document.addEventListener("click", (event) => {
  const emptyPaymentAction = event.target.closest("[data-empty-payment-action]");
  if (emptyPaymentAction) {
    if (accountCanSend()) {
      enterDapp("send");
      $("handle").focus();
    } else {
      showRegister();
    }
    return;
  }
  const actionButton = event.target.closest("[data-payment-action]");
  if (actionButton) settlePayment(actionButton.dataset.paymentId, actionButton.dataset.paymentAction);
  const historyItem = event.target.closest(".history-item[data-payment-id]");
  if (historyItem) {
    state.activePaymentId = historyItem.dataset.paymentId;
    window.history.replaceState(null, "", `#claim=${state.activePaymentId}`);
    renderAll();
    setView("claim");
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("paymentConfirmModal").classList.contains("hidden")) closePaymentConfirmation();
});

window.addEventListener("hashchange", async () => {
  const id = claimIdFromLocation();
  if (!id) return;
  try {
    const { payment } = await api(`/api/payments/${encodeURIComponent(id)}`);
    mergePayment(payment);
    renderAll();
    enterDapp("claim");
  } catch (error) { notice(error.message, "error"); }
});

initializeRecipientPicker();
initIdentityField();
showHome();
loadState().catch((error) => { showHome(); notice(error.message, "error"); });
