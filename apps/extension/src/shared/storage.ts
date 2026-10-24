import { ExtensionStorage } from "./types";
import { DEFAULT_API_URL } from "./config";

export const DEFAULT_STORAGE: ExtensionStorage = {
  token: null,
  apiUrl: DEFAULT_API_URL,
  user: null,
  distractionSettings: null,
  blockedDomains: [],
  activeSession: null,
  isBlockingActive: false,
  lastSyncTime: null,
  syncError: null,
  lastSyncStatus: "idle",
  rulesCount: 0,
};

export async function getStorage(): Promise<ExtensionStorage> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve(DEFAULT_STORAGE);
      return;
    }
    chrome.storage.local.get(null, (result) => {
      resolve({
        ...DEFAULT_STORAGE,
        ...result,
      } as ExtensionStorage);
    });
  });
}

export async function setStorage(partial: Partial<ExtensionStorage>): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.set(partial, () => {
      resolve();
    });
  });
}

export async function clearExtensionSession(): Promise<void> {
  const current = await getStorage();
  await setStorage({
    token: null,
    user: null,
    distractionSettings: null,
    blockedDomains: [],
    activeSession: null,
    isBlockingActive: false,
    lastSyncTime: null,
    syncError: null,
    lastSyncStatus: "idle",
    rulesCount: 0,
  });
}
