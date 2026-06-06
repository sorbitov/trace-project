const state = {
  payments: JSON.parse(localStorage.getItem("handlepay.payments") || "[]"),
  dashboard: JSON.parse(localStorage.getItem("handlepay.dashboard") || "null"),
  activePaymentId: localStorage.getItem("handlepay.activePaymentId") || null,
  xVerified: false,
  walletConnected: false,
};

const $ = (id) => document.getElementById(id);

function save() {
  localStorage.setItem("handlepay.payments", JSON.stringify(state.payments));
  localStorage.setItem("handlepay.dashboard", JSON.stringify(state.dashboard));
  if (state.activePaymentId) localStorage.setItem("handlepay.activePaymentId", state.activePaymentId);
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
  `;
}

function renderClaim() {
  const payment = activePayment();
  const box = $("claimPreview");
  if (!payment) {
    box.innerHTML = "<strong>No active tip.</strong><p>Create a tip first.</p>";
    return;
  }

  const amount = payment.amountVisibility === "public" || state.xVerified ? formatUsdc(payment.amount) : "USDC amount hidden";
  const sender = payment.senderVisibility === "public" || state.xVerified ? payment.sender : "Sender hidden";
  const memo = state.xVerified ? payment.memo : "Private memo unlocks after X OAuth.";
  box.innerHTML = `
    <p class="eyebrow">For @${payment.handle}</p>
    <h2>${amount}</h2>
    <p>${sender}</p>
    <p>${memo}</p>
    <span class="status">${payment.status}</span>
  `;
}

function renderHistory() {
  $("historyCount").textContent = state.dashboard ? `${state.payments.length} payments` : "not created";
  const profile = $("dashboardProfile");
  if (!state.dashboard) {
    profile.innerHTML = '<div class="empty-state">Create dashboard to unlock sending, history, and refund controls.</div>';
  } else {
    profile.innerHTML = `
      <div class="profile-summary-card">
        <strong>@${state.dashboard.handle}</strong>
        <span>${state.dashboard.displayName}</span>
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
        <article class="history-item">
          <div>
            <strong>@${payment.handle}</strong>
            <p>${formatUsdc(payment.amount)} tip · ${payment.expiryDays} day expiry · ${payment.cancelMode}</p>
          </div>
          <span class="status">${payment.status}</span>
        </article>
      `,
    )
    .join("");
}

function renderAll() {
  updateQuote();
  renderDashboardGate();
  renderLatest();
  renderClaim();
  renderHistory();
}

function renderDashboardGate() {
  const hasDashboard = Boolean(state.dashboard);
  $("sendGate").classList.toggle("hidden", hasDashboard);
  $("sendForm").querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !hasDashboard;
  });
  $("dashboardSetup").classList.toggle("hidden", hasDashboard);
  if (hasDashboard) {
    $("senderVisibility").value = state.dashboard.defaultSenderVisibility;
  }
}

function setView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === id));
}

function createPayment(event) {
  event.preventDefault();
  if (!state.dashboard) {
    setView("dashboard");
    return;
  }
  const handle = normalizeHandle($("handle").value);
  if (!handle) return;

  const amount = Number($("amount").value);
  const feePct = getFeePct();
  const id = `hp_${Date.now().toString(36)}`;
  const xUserId = `mock-x-${handle.length}-${handle.charCodeAt(0)}`;
  const claimUrl = `https://handlepay.local/claim/${id}`;

  const payment = {
    id,
    handle,
    xUserId,
    amount,
    feePct,
    fee: amount * (feePct / 100),
    expiryDays: getExpiryDays(),
    amountVisibility: $("amountVisibility").value,
    senderVisibility: $("senderVisibility").value,
    cancelMode: $("cancelMode").value,
    memo: $("memo").value.trim(),
    sender: `@${state.dashboard.handle}`,
    status: "pending",
    claimUrl,
    shareText: `@${handle} you have ${amount} USDC waiting on Arc. Claim with X: ${claimUrl}`,
    createdAt: new Date().toISOString(),
  };

  state.payments.unshift(payment);
  state.activePaymentId = id;
  state.xVerified = false;
  state.walletConnected = false;
  $("mockWallet").disabled = true;
  $("mockClaim").disabled = true;
  save();
  renderAll();
}

function createDashboard(event) {
  event.preventDefault();
  const handle = normalizeHandle($("senderHandle").value);
  const displayName = $("displayName").value.trim();
  if (!handle || !displayName) return;

  state.dashboard = {
    handle,
    displayName,
    defaultSenderVisibility: $("defaultSenderVisibility").value,
    createdAt: new Date().toISOString(),
    xUserId: `mock-sender-x-${handle.length}-${handle.charCodeAt(0)}`,
  };
  save();
  renderAll();
  setView("send");
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-view-jump]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewJump));
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
$("dashboardForm").addEventListener("submit", createDashboard);

$("mockX").addEventListener("click", () => {
  state.xVerified = true;
  $("mockWallet").disabled = false;
  renderAll();
});

$("mockWallet").addEventListener("click", () => {
  state.walletConnected = true;
  $("mockClaim").disabled = false;
  renderAll();
});

$("mockClaim").addEventListener("click", () => {
  const payment = activePayment();
  if (!payment) return;
  payment.status = "claimed";
  save();
  renderAll();
});

$("seedDemo").addEventListener("click", () => {
  if (!state.dashboard) {
    $("senderHandle").value = "@kant";
    $("displayName").value = "Arc sender";
    $("defaultSenderVisibility").value = "private";
  }
  $("handle").value = "@arc_builder";
  $("amount").value = "42";
  $("memo").value = "Loved the Arc stablecoin payments breakdown.";
  updateQuote();
});

renderAll();
