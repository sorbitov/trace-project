const state = {
  payments: [],
  dashboard: null,
  activePaymentId: null,
  walletConnected: false,
  registrationX: null,
  registrationWallet: null,
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function notice(message, kind = "ok") {
  const box = $("appNotice");
  box.textContent = message;
  box.className = `notice ${kind}`;
  window.clearTimeout(notice.timer);
  notice.timer = window.setTimeout(() => box.classList.add("hidden"), 5200);
}

function registerNotice(message, kind = "ok") {
  const box = $("registerNotice");
  const readable = {
    missing_x_oauth_config: "X OAuth keys are not set on this server yet.",
    invalid_x_oauth_state: "X connection expired. Try connecting again.",
  };
  box.textContent = readable[message] || message;
  box.className = `register-notice ${kind}`;
}

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeHandle(value) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function getExpiryDays() {
  return $("expiry").value === "custom" ? Number($("customExpiry").value) : Number($("expiry").value);
}

function getFeePct() {
  const raw = $("feePreset").value === "custom" ? Number($("customFee").value) : Number($("feePreset").value);
  return Math.max(0.5, raw || 0.5);
}

function formatUsdc(value) {
  return `${Number(value).toFixed(2)} USDC`;
}

function activePayment() {
  return state.payments.find((payment) => payment.id === state.activePaymentId) || state.payments[0];
}

function setServerState(nextState) {
  state.dashboard = nextState.dashboard || null;
  state.payments = nextState.payments || [];
  if (!state.activePaymentId && state.payments[0]) state.activePaymentId = state.payments[0].id;
}

async function loadState() {
  const nextState = await api("/api/state");
  setServerState(nextState);
  await loadXSession();
  renderAll();
  const params = new URLSearchParams(window.location.search);
  if (params.has("x") || params.has("x_error")) {
    showRegister();
  } else {
    showHome();
  }
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
  setView("send");
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
  const feePct = getFeePct();
  const fee = amount * (feePct / 100);
  $("totalDue").textContent = formatUsdc(amount + fee);
  $("feeLine").textContent = `Includes ${fee.toFixed(2)} USDC platform fee for X verification and protocol costs.`;
}

function renderLatest() {
  const payment = activePayment();
  const box = $("latestPayment");
  if (!payment) {
    box.className = "empty-state";
    box.textContent = "No tip created yet.";
    return;
  }

  const canCancel = payment.status === "pending" && payment.cancelMode === "cancellable";
  box.className = "receipt";
  const visibleAmount = payment.amountVisibility === "public" ? formatUsdc(payment.amount) : "Private until X OAuth";
  const visibleSender = payment.senderVisibility === "public" ? payment.sender : "Private";
  box.innerHTML = `
    <strong>@${payment.handle}</strong>
    <span>Amount: ${visibleAmount}</span>
    <span>Sender: ${visibleSender}</span>
    <span>Expiry: ${payment.expiryDays} days</span>
    <span>Status: ${payment.status}</span>
    <code>${payment.claimUrl}</code>
    <div class="copybox">
      <small>X post copy</small>
      <span>${payment.shareText}</span>
    </div>
    <button class="ghost-button" data-cancel-payment="${payment.id}" ${canCancel ? "" : "disabled"}>Cancel tip</button>
  `;
}

function renderClaim() {
  const payment = activePayment();
  const box = $("claimPreview");
  if (!payment) {
    box.innerHTML = "<strong>No active tip.</strong><p>Create a tip first.</p>";
    $("verifyX").disabled = true;
    $("connectWallet").disabled = true;
    $("claimPayment").disabled = true;
    $("walletClaimWrap").classList.add("hidden");
    return;
  }

  const xVerified = Boolean(payment.xVerified);
  const amount = payment.amountVisibility === "public" || xVerified ? formatUsdc(payment.amount) : "USDC amount hidden";
  const sender = payment.senderVisibility === "public" || xVerified ? payment.sender : "Sender hidden";
  const memo = xVerified ? payment.memo || "No private memo." : "Private memo unlocks after X OAuth.";
  box.innerHTML = `
    <p class="eyebrow">For @${payment.handle}</p>
    <h2>${amount}</h2>
    <p>${sender}</p>
    <p>${memo}</p>
    <span class="status">${payment.status}</span>
  `;

  const pending = payment.status === "pending";
  $("verifyX").disabled = !pending || xVerified;
  $("connectWallet").disabled = !pending || !xVerified;
  $("claimPayment").disabled = !pending || !xVerified || !state.walletConnected;
  $("walletClaimWrap").classList.toggle("hidden", !xVerified);
}

function renderHistory() {
  $("historyCount").textContent = state.dashboard ? `${state.payments.length} payments` : "not created";
  const profile = $("dashboardProfile");
  if (!state.dashboard) {
    profile.innerHTML = '<div class="empty-state">Register profile to unlock sending, history, and refund controls.</div>';
  } else {
    profile.innerHTML = `
      <div class="profile-summary-card">
        <strong>@${state.dashboard.handle}</strong>
        <span>${state.dashboard.walletAddress}</span>
        <small>Default sender visibility: ${state.dashboard.defaultSenderVisibility}</small>
      </div>
    `;
  }

  const list = $("history");
  if (!state.dashboard) {
    list.innerHTML = "";
    return;
  }

  if (!state.payments.length) {
    list.innerHTML = '<div class="empty-state">No sent or received tips yet.</div>';
    return;
  }

  list.innerHTML = state.payments
    .map(
      (payment) => `
        <article class="history-item" data-payment-id="${payment.id}">
          <div>
            <strong>@${payment.handle}</strong>
            <p>${formatUsdc(payment.amount)} tip | ${payment.expiryDays} day expiry | ${payment.cancelMode}</p>
          </div>
          <span class="status">${payment.status}</span>
        </article>
      `,
    )
    .join("");
}

function renderDashboardGate() {
  const hasDashboard = Boolean(state.dashboard);
  $("sendGate").classList.toggle("hidden", hasDashboard);
  $("sendForm").querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !hasDashboard;
  });
  if (hasDashboard) $("senderVisibility").value = state.dashboard.defaultSenderVisibility;
}

function renderRegistration() {
  const connected = Boolean(state.registrationX);
  const walletConnected = Boolean(state.registrationWallet);
  const identity = $("xIdentity");
  if (!identity) return;

  identity.innerHTML = connected
    ? `
      <strong>${state.registrationX.displayName}</strong>
      <small>X connected. Add Arc wallet to finish profile.</small>
    `
    : `
      <strong>X account not connected</strong>
      <small>Your sender handle will be pulled from X OAuth.</small>
    `;

  $("connectXProfile").textContent = connected ? "X connected" : "Connect X / Twitter";
  $("connectXProfile").disabled = connected;

  $("walletIdentity").innerHTML = walletConnected
    ? `
      <strong>${shortAddress(state.registrationWallet)}</strong>
      <small>Wallet connected for Arc profile settlement.</small>
    `
    : `
      <strong>Arc wallet not connected</strong>
      <small>Connect wallet after X so the profile has a settlement address.</small>
    `;
  $("connectProfileWallet").textContent = walletConnected ? "Wallet connected" : "Connect wallet";
  $("connectProfileWallet").disabled = !connected || walletConnected;
  $("createProfile").disabled = !connected || !walletConnected;
}

function renderAll() {
  updateQuote();
  renderDashboardGate();
  renderRegistration();
  renderLatest();
  renderClaim();
  renderHistory();
}

function setView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === id));
}

async function createPayment(event) {
  event.preventDefault();
  try {
    const nextState = await api("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        handle: normalizeHandle($("handle").value),
        amount: Number($("amount").value),
        feePct: getFeePct(),
        expiryDays: getExpiryDays(),
        amountVisibility: $("amountVisibility").value,
        senderVisibility: $("senderVisibility").value,
        cancelMode: $("cancelMode").value,
        memo: $("memo").value.trim(),
      }),
    });
    setServerState(nextState);
    state.activePaymentId = state.payments[0]?.id || null;
    state.walletConnected = false;
    renderAll();
    notice("Tip created. Share the generated X post with the recipient.");
  } catch (error) {
    notice(error.message, "error");
    if (error.message.includes("dashboard")) setView("dashboard");
  }
}

async function registerProfile(event) {
  event.preventDefault();
  if (!state.registrationX) {
    registerNotice("Connect X before creating profile.", "error");
    return;
  }
  if (!state.registrationWallet) {
    registerNotice("Connect Arc wallet before creating profile.", "error");
    return;
  }
  try {
    const nextState = await api("/api/dashboard", {
      method: "POST",
      body: JSON.stringify({
        handle: state.registrationX.handle,
        walletAddress: state.registrationWallet,
        defaultSenderVisibility: $("profileSenderVisibility").value,
      }),
    });
    setServerState(nextState);
    renderAll();
    closeProfileModal();
    enterDapp("send");
    notice("Profile registered. Dapp is unlocked.");
  } catch (error) {
    registerNotice(error.message, "error");
  }
}

async function connectXForRegistration() {
  window.location.href = "/api/auth/x/start";
}

async function loadXSession() {
  try {
    const result = await api("/api/auth/x/session");
    state.registrationX = result.connected ? result.profile : null;
    const params = new URLSearchParams(window.location.search);
    const xError = params.get("x_error");
    if (xError) registerNotice(decodeURIComponent(xError), "error");
    if (params.get("x") === "connected" && state.registrationX) {
      registerNotice(`Connected as ${state.registrationX.displayName}. Connect wallet to continue.`);
    }
  } catch {
    state.registrationX = null;
  }
}

async function requestWalletAddress() {
  if (!window.ethereum?.request) {
    throw new Error("Wallet provider not found. Open this page in a browser with MetaMask or another EVM wallet.");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const walletAddress = accounts?.[0];
  if (!walletAddress) throw new Error("Wallet connection was cancelled.");
  return walletAddress;
}

async function connectProfileWallet() {
  try {
    state.registrationWallet = await requestWalletAddress();
    renderRegistration();
    registerNotice(`Wallet connected: ${shortAddress(state.registrationWallet)}. Create profile to enter dapp.`);
  } catch (error) {
    registerNotice(error.message, "error");
  }
}

async function verifyX() {
  const payment = activePayment();
  if (!payment) return;
  try {
    const result = await api(`/api/payments/${payment.id}/verify-x`, { method: "POST" });
    setServerState(result.state);
    state.activePaymentId = payment.id;
    renderAll();
    notice("X identity verified. Connect an Arc wallet to claim.");
  } catch (error) {
    notice(error.message, "error");
  }
}

async function connectWallet() {
  try {
    const walletAddress = await requestWalletAddress();
    state.walletConnected = true;
    $("claimWallet").value = walletAddress;
    renderAll();
    notice("Wallet connected for this claim.");
  } catch (error) {
    notice(error.message, "error");
  }
}

async function claimPayment() {
  const payment = activePayment();
  if (!payment) return;
  try {
    const nextState = await api(`/api/payments/${payment.id}/claim`, {
      method: "POST",
      body: JSON.stringify({ walletAddress: $("claimWallet").value.trim() }),
    });
    setServerState(nextState);
    state.activePaymentId = payment.id;
    state.walletConnected = false;
    renderAll();
    notice("USDC claimed to the connected wallet.");
  } catch (error) {
    notice(error.message, "error");
  }
}

async function cancelPayment(paymentId) {
  try {
    const nextState = await api(`/api/payments/${paymentId}/cancel`, { method: "POST" });
    setServerState(nextState);
    renderAll();
    notice("Tip cancelled and returned to sender.");
  } catch (error) {
    notice(error.message, "error");
  }
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-enter-dapp]").forEach((button) => {
  button.addEventListener("click", () => enterDapp("send"));
});

document.querySelectorAll("[data-enter-dapp-dashboard]").forEach((button) => {
  button.addEventListener("click", showRegister);
});

document.querySelectorAll("[data-register-profile]").forEach((button) => {
  button.addEventListener("click", showRegister);
});

document.querySelectorAll("[data-home]").forEach((button) => {
  button.addEventListener("click", showHome);
});

document.querySelectorAll("[data-close-profile-modal]").forEach((button) => {
  button.addEventListener("click", closeProfileModal);
});

document.querySelectorAll("[data-view-jump]").forEach((button) => {
  button.addEventListener("click", () => enterDapp(button.dataset.viewJump));
});

$("expiry").addEventListener("change", () => {
  $("customExpiryWrap").classList.toggle("hidden", $("expiry").value !== "custom");
  renderAll();
});

$("feePreset").addEventListener("change", () => {
  $("customFeeWrap").classList.toggle("hidden", $("feePreset").value !== "custom");
  renderAll();
});

["amount", "customExpiry", "customFee"].forEach((id) => $(id).addEventListener("input", renderAll));
$("sendForm").addEventListener("submit", createPayment);
$("profileForm").addEventListener("submit", registerProfile);
$("connectXProfile").addEventListener("click", connectXForRegistration);
$("connectProfileWallet").addEventListener("click", connectProfileWallet);
$("verifyX").addEventListener("click", verifyX);
$("connectWallet").addEventListener("click", connectWallet);
$("claimPayment").addEventListener("click", claimPayment);

document.addEventListener("click", (event) => {
  const cancelButton = event.target.closest("[data-cancel-payment]");
  if (cancelButton) cancelPayment(cancelButton.dataset.cancelPayment);

  const historyItem = event.target.closest("[data-payment-id]");
  if (historyItem) {
    state.activePaymentId = historyItem.dataset.paymentId;
    renderAll();
    setView("claim");
  }
});

showHome();
loadState().catch((error) => {
  showHome();
  notice(error.message, "error");
});
