import { ExtensionStorage } from "../shared/types";

// DOM Elements
const connectionPill = document.getElementById("connectionPill")!;
const connectionText = document.getElementById("connectionText")!;
const errorBanner = document.getElementById("errorBanner")!;
const errorMessage = document.getElementById("errorMessage")!;

const disconnectedView = document.getElementById("disconnectedView")!;
const connectedView = document.getElementById("connectedView")!;

const pairingForm = document.getElementById("pairingForm") as HTMLFormElement;
const pairingCodeInput = document.getElementById("pairingCodeInput") as HTMLInputElement;
const apiUrlInput = document.getElementById("apiUrlInput") as HTMLInputElement;
const pairBtn = document.getElementById("pairBtn") as HTMLButtonElement;
const openSettingsLink = document.getElementById("openSettingsLink") as HTMLAnchorElement;

const sessionTypeBadge = document.getElementById("sessionTypeBadge")!;
const sessionStatusBadge = document.getElementById("sessionStatusBadge")!;
const timerCountdown = document.getElementById("timerCountdown")!;
const sessionLabel = document.getElementById("sessionLabel")!;

const blockingShieldIcon = document.getElementById("blockingShieldIcon")!;
const blockingStatusTitle = document.getElementById("blockingStatusTitle")!;
const blockingStatusDesc = document.getElementById("blockingStatusDesc")!;
const rulesCountBadge = document.getElementById("rulesCountBadge")!;

const domainsListContainer = document.getElementById("domainsListContainer")!;
const totalDomainsCount = document.getElementById("totalDomainsCount")!;

const syncBtn = document.getElementById("syncBtn") as HTMLButtonElement;
const syncIcon = document.getElementById("syncIcon")!;
const goToDashboardBtn = document.getElementById("goToDashboardBtn") as HTMLButtonElement;
const disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement;
const lastSyncedTime = document.getElementById("lastSyncedTime")!;

let countdownInterval: number | null = null;
let currentRemainingSeconds = 0;

function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startTimerCountdown(remaining: number, isPaused: boolean) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  currentRemainingSeconds = remaining;
  timerCountdown.textContent = formatCountdown(currentRemainingSeconds);

  if (isPaused || currentRemainingSeconds <= 0) {
    return;
  }

  countdownInterval = window.setInterval(() => {
    currentRemainingSeconds -= 1;
    if (currentRemainingSeconds <= 0) {
      currentRemainingSeconds = 0;
      timerCountdown.textContent = "00:00";
      if (countdownInterval) clearInterval(countdownInterval);
      // Trigger background sync to refresh state
      chrome.runtime.sendMessage({ type: "SYNC" }, () => refreshState());
      return;
    }
    timerCountdown.textContent = formatCountdown(currentRemainingSeconds);
  }, 1000);
}

function renderUI(data: ExtensionStorage) {
  // 1. Error Banner
  if (data.syncError) {
    errorBanner.classList.remove("hidden");
    errorMessage.textContent = data.syncError;
  } else {
    errorBanner.classList.add("hidden");
  }

  // 2. Connection State
  const isConnected = Boolean(data.token);
  if (!isConnected) {
    connectionPill.className = "status-pill status-disconnected";
    connectionText.textContent = "Disconnected";
    disconnectedView.classList.remove("hidden");
    connectedView.classList.add("hidden");
    if (data.apiUrl) {
      apiUrlInput.value = data.apiUrl;
      openSettingsLink.href = `${data.apiUrl.replace(/\/+$/, "")}/settings`;
    }
    return;
  }

  // Connected
  disconnectedView.classList.add("hidden");
  connectedView.classList.remove("hidden");

  const displayName = data.user?.displayName || data.user?.username || "Connected";
  connectionPill.className = "status-pill status-connected";
  connectionText.textContent = displayName;

  // 3. Active Session
  const session = data.activeSession;
  if (session) {
    const isFocus = session.sessionType === "focus";
    sessionTypeBadge.textContent = isFocus ? "Focus Session" : "Break Interval";
    sessionTypeBadge.style.color = isFocus ? "#10b981" : "#3b82f6";

    const isPaused = session.status === "paused";
    sessionStatusBadge.textContent = isPaused ? "Paused" : "Active";
    sessionStatusBadge.style.background = isPaused ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)";
    sessionStatusBadge.style.color = isPaused ? "#fbbf24" : "#34d399";

    sessionLabel.textContent = session.label || (isFocus ? "Deep Work" : "Rest");

    // Compute remaining seconds from expectedEndAt or remainingSeconds
    const remaining = session.remainingSeconds ?? 0;
    startTimerCountdown(remaining, isPaused);
  } else {
    sessionTypeBadge.textContent = "No Active Session";
    sessionTypeBadge.style.color = "var(--text-muted)";
    sessionStatusBadge.textContent = "Standby";
    sessionStatusBadge.style.background = "rgba(255,255,255,0.06)";
    sessionStatusBadge.style.color = "var(--text-muted)";
    timerCountdown.textContent = "--:--";
    sessionLabel.textContent = "Start a focus timer in FocusForge";
    if (countdownInterval) clearInterval(countdownInterval);
  }

  // 4. Blocking Indicator
  if (data.isBlockingActive) {
    blockingShieldIcon.textContent = "🛡️";
    blockingShieldIcon.className = "shield-indicator shield-active";
    blockingStatusTitle.textContent = "Blocking Active";
    blockingStatusTitle.style.color = "#10b981";
    blockingStatusDesc.textContent = "Distracting websites are blocked";
  } else {
    blockingShieldIcon.textContent = "🛡️";
    blockingShieldIcon.className = "shield-indicator shield-idle";
    blockingStatusTitle.textContent = "Blocking Standby";
    blockingStatusTitle.style.color = "var(--text-secondary)";
    blockingStatusDesc.textContent =
      data.distractionSettings?.scheduleMode === "focus_only"
        ? "Activates during focus sessions"
        : "Blocking is currently inactive";
  }

  const domainsCount = data.blockedDomains?.length || 0;
  rulesCountBadge.textContent = `${domainsCount} sites`;
  totalDomainsCount.textContent = `${domainsCount} total`;

  // 5. Blocked Domains List
  domainsListContainer.innerHTML = "";
  if (!data.blockedDomains || data.blockedDomains.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "text-muted text-xs";
    emptyEl.style.padding = "8px 0";
    emptyEl.textContent = "No websites configured in blocklist.";
    domainsListContainer.appendChild(emptyEl);
  } else {
    data.blockedDomains.forEach((domain) => {
      const itemEl = document.createElement("div");
      itemEl.className = "domain-item";
      itemEl.innerHTML = `<span class="domain-icon">🌐</span><span>${domain}</span>`;
      domainsListContainer.appendChild(itemEl);
    });
  }

  // 6. Meta
  if (data.lastSyncTime) {
    const date = new Date(data.lastSyncTime);
    lastSyncedTime.textContent = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    lastSyncedTime.textContent = "Never";
  }
}

async function refreshState() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
    if (response?.success && response.data) {
      renderUI(response.data);
    }
  });
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

// Form submission for Pairing
pairingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = pairingCodeInput.value.trim().toUpperCase();
  const apiUrl = apiUrlInput.value.trim() || "http://localhost:3000";

  if (!code) return;

  pairBtn.disabled = true;
  pairBtn.textContent = "Pairing...";
  errorBanner.classList.add("hidden");

  chrome.runtime.sendMessage({ type: "PAIR", code, apiUrl }, (res) => {
    pairBtn.disabled = false;
    pairBtn.textContent = "Pair Extension";

    if (res?.success) {
      pairingCodeInput.value = "";
      refreshState();
    } else {
      errorBanner.classList.remove("hidden");
      errorMessage.textContent = res?.error || "Pairing failed. Please check the code and try again.";
    }
  });
});

// Manual Sync button
syncBtn.addEventListener("click", () => {
  syncBtn.disabled = true;
  syncIcon.classList.add("spinning");

  chrome.runtime.sendMessage({ type: "SYNC" }, (res) => {
    setTimeout(() => {
      syncBtn.disabled = false;
      syncIcon.classList.remove("spinning");
      refreshState();
    }, 400);
  });
});

// Open FocusForge Web App
goToDashboardBtn.addEventListener("click", async () => {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
    const url = res?.data?.apiUrl || "http://localhost:3000";
    chrome.tabs.create({ url: `${url.replace(/\/+$/, "")}/dashboard` });
  });
});

// Disconnect
disconnectBtn.addEventListener("click", () => {
  if (confirm("Disconnect FocusForge Extension from this account?")) {
    chrome.runtime.sendMessage({ type: "DISCONNECT" }, () => {
      refreshState();
    });
  }
});

// Initial load
refreshState();
