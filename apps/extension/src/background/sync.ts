import { getStorage, setStorage, clearExtensionSession } from "../shared/storage";
import { syncSession } from "../shared/api";
import { updateDynamicBlockingRules, clearAllDynamicRules } from "./rules";

const ALARM_PERIODIC_SYNC = "focus_forge_sync";
const ALARM_SESSION_EXPIRY = "focus_forge_expiry";

let consecutiveErrors = 0;

/**
 * Updates the extension badge text and color based on current blocking state.
 */
export async function updateBadge(state: {
  isBlockingActive: boolean;
  isPaired: boolean;
  hasError: boolean;
}): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.action) return;

  if (!state.isPaired) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  if (state.hasError) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" }); // Warning amber
    return;
  }

  if (state.isBlockingActive) {
    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#10b981" }); // Focus green
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

/**
 * Reconciles stored session status upon extension/browser restart.
 * If a session's expected end timestamp has passed while the browser was closed,
 * rules are immediately purged before reaching out to the server.
 */
export async function reconcileStartupState(): Promise<void> {
  const storage = await getStorage();
  const now = Date.now();

  if (storage.activeSession) {
    const endMs = new Date(storage.activeSession.expectedEndAt).getTime();
    if (now >= endMs) {
      console.log("[FocusForge] Session expired while browser was inactive. Purging rules.");
      await clearAllDynamicRules();
      await setStorage({
        activeSession: null,
        isBlockingActive: false,
        rulesCount: 0,
      });
      await updateBadge({ isBlockingActive: false, isPaired: Boolean(storage.token), hasError: false });
    }
  }
}

/**
 * Performs full synchronization with the FocusForge server.
 */
export async function syncNow(): Promise<{ success: boolean; error?: string }> {
  const storage = await getStorage();
  if (!storage.token) {
    await clearAllDynamicRules();
    await updateBadge({ isBlockingActive: false, isPaired: false, hasError: false });
    return { success: false, error: "Not paired" };
  }

  try {
    const data = await syncSession(storage.apiUrl, storage.token);
    consecutiveErrors = 0;

    // Apply declarativeNetRequest dynamic rules
    const rulesCount = await updateDynamicBlockingRules(
      data.blockedDomains,
      data.isBlockingActive
    );

    // Schedule exact session expiration alarm
    if (data.activeSession && data.activeSession.status === "active") {
      const endMs = new Date(data.activeSession.expectedEndAt).getTime();
      const delayInMinutes = Math.max(0.1, (endMs - Date.now()) / (60 * 1000));
      chrome.alarms.create(ALARM_SESSION_EXPIRY, {
        delayInMinutes,
      });
    } else {
      chrome.alarms.clear(ALARM_SESSION_EXPIRY);
    }

    // Adjust periodic sync frequency: 0.5 min during active session, 1 min when idle
    const syncPeriod = data.activeSession ? 0.5 : 1.0;
    chrome.alarms.create(ALARM_PERIODIC_SYNC, {
      periodInMinutes: syncPeriod,
    });

    // Update persisted storage
    await setStorage({
      user: data.user,
      distractionSettings: data.distractionSettings,
      blockedDomains: data.blockedDomains,
      activeSession: data.activeSession,
      isBlockingActive: data.isBlockingActive,
      lastSyncTime: new Date().toISOString(),
      lastSyncStatus: "success",
      syncError: null,
      rulesCount,
    });

    await updateBadge({
      isBlockingActive: data.isBlockingActive,
      isPaired: true,
      hasError: false,
    });

    return { success: true };
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    consecutiveErrors++;

    console.warn(`[FocusForge] Sync failed (attempt ${consecutiveErrors}):`, err);

    // If token was revoked or expired on the server
    if (errorObj?.code === "UNAUTHORIZED") {
      await clearAllDynamicRules();
      await clearExtensionSession();
      await setStorage({
        syncError: "Extension connection was revoked or expired. Please re-pair in FocusForge Settings.",
        lastSyncStatus: "error",
      });
      await updateBadge({ isBlockingActive: false, isPaired: false, hasError: true });
      return { success: false, error: "Unauthorized" };
    }

    // Fail-safe offline behavior:
    // If connection is lost and active session's expected end has arrived, do not keep claiming active blocking!
    if (storage.activeSession) {
      const endMs = new Date(storage.activeSession.expectedEndAt).getTime();
      if (Date.now() >= endMs) {
        console.log("[FocusForge] Connection lost and session expired. Safely removing rules.");
        await clearAllDynamicRules();
        await setStorage({
          isBlockingActive: false,
          activeSession: null,
          rulesCount: 0,
        });
      }
    }

    await setStorage({
      lastSyncStatus: "offline",
      syncError: errorObj?.message || "Failed to reach FocusForge server.",
    });

    await updateBadge({
      isBlockingActive: storage.isBlockingActive,
      isPaired: true,
      hasError: true,
    });

    // Exponential backoff for alarm
    const backoffMinutes = Math.min(5, Math.pow(1.5, consecutiveErrors));
    chrome.alarms.create(ALARM_PERIODIC_SYNC, {
      delayInMinutes: backoffMinutes,
    });

    return { success: false, error: errorObj?.message || "Sync failed" };
  }
}
