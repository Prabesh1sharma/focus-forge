import { getStorage, setStorage, clearExtensionSession } from "../shared/storage";
import { pairWithCode, revokeToken } from "../shared/api";
import { clearAllDynamicRules } from "./rules";
import { syncNow, reconcileStartupState, updateBadge } from "./sync";
import { ExtensionMessage } from "../shared/types";

// ─── Lifecycle Listeners ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  console.log("[FocusForge] Extension installed or updated.");
  await reconcileStartupState();
  await syncNow();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("[FocusForge] Browser started up.");
  await reconcileStartupState();
  await syncNow();
});

// ─── Alarms ───────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "focus_forge_sync") {
    await syncNow();
  } else if (alarm.name === "focus_forge_expiry") {
    console.log("[FocusForge] Session reached expected end time. Reconciling rules.");
    await clearAllDynamicRules();
    await syncNow();
  }
});

// ─── Messaging ────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    (async () => {
      try {
        switch (message.type) {
          case "PAIR": {
            const current = await getStorage();
            const apiUrl = message.apiUrl || current.apiUrl || "http://localhost:3000";
            const pairResult = await pairWithCode(apiUrl, message.code);

            await setStorage({
              token: pairResult.token,
              apiUrl,
              user: pairResult.user,
              syncError: null,
              lastSyncStatus: "idle",
            });

            const syncResult = await syncNow();
            sendResponse({ success: true, syncResult });
            break;
          }

          case "SYNC": {
            const syncResult = await syncNow();
            sendResponse(syncResult);
            break;
          }

          case "DISCONNECT": {
            const storage = await getStorage();
            if (storage.token) {
              await revokeToken(storage.apiUrl, storage.token);
            }
            await clearAllDynamicRules();
            await clearExtensionSession();
            await updateBadge({ isBlockingActive: false, isPaired: false, hasError: false });
            sendResponse({ success: true });
            break;
          }

          case "GET_STATUS": {
            const status = await getStorage();
            sendResponse({ success: true, data: status });
            break;
          }

          default:
            sendResponse({ error: "Unknown message type" });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Operation failed";
        sendResponse({ success: false, error: errorMsg });
      }
    })();

    return true; // Keep message channel open for async response
  }
);
