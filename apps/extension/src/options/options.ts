import { getStorage, setStorage } from "../shared/storage";
import { DEFAULT_API_URL } from "../shared/config";

const apiUrlInput = document.getElementById("apiUrlInput") as HTMLInputElement;
const testBtn = document.getElementById("testBtn") as HTMLButtonElement;
const testResult = document.getElementById("testResult")!;
const defaultPresetBtn = document.getElementById("defaultPresetBtn") as HTMLButtonElement | null;
const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
const saveStatus = document.getElementById("saveStatus")!;
const accountStatusContent = document.getElementById("accountStatusContent")!;

if (defaultPresetBtn) {
  defaultPresetBtn.textContent = `Default (${DEFAULT_API_URL})`;
  defaultPresetBtn.dataset.url = DEFAULT_API_URL;
}

async function init() {
  const storage = await getStorage();
  apiUrlInput.value = storage.apiUrl || DEFAULT_API_URL;

  // Render Account Status
  if (storage.token) {
    accountStatusContent.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(16, 185, 129, 0.08); border-radius: 8px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #34d399;">Connected to FocusForge</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            User: <strong>${storage.user?.displayName || storage.user?.username || "Authenticated"}</strong>
          </div>
        </div>
        <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #10b981; color: #fff; font-weight: 600;">Active</span>
      </div>
    `;
  } else {
    accountStatusContent.innerHTML = `
      <div style="padding: 12px; background: rgba(245, 158, 11, 0.08); border-radius: 8px;">
        <div style="font-size: 13px; font-weight: 600; color: #fbbf24;">Not Currently Paired</div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          Open the extension popup and enter a single-use pairing code from your FocusForge Settings to connect.
        </div>
      </div>
    `;
  }
}

// Preset buttons
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetUrl = (btn as HTMLButtonElement).dataset.url;
    if (targetUrl) {
      apiUrlInput.value = targetUrl;
      testResult.className = "test-result hidden";
    }
  });
});

// Test connection
testBtn.addEventListener("click", async () => {
  const url = apiUrlInput.value.trim().replace(/\/+$/, "");
  if (!url) return;

  testBtn.disabled = true;
  testBtn.textContent = "Testing...";
  testResult.className = "test-result hidden";

  try {
    const res = await fetch(`${url}/api/extension/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "" }), // empty ping
    });

    // 400 is expected because code was empty, meaning the endpoint is up and functioning!
    if (res.status === 400 || res.status === 200 || res.status === 405) {
      testResult.className = "test-result success";
      testResult.textContent = `✓ Successfully reached FocusForge server at ${url}`;
    } else {
      testResult.className = "test-result error";
      testResult.textContent = `Server responded with unexpected status ${res.status}`;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    testResult.className = "test-result error";
    testResult.textContent = `✗ Cannot reach server: ${msg}`;
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = "Test Connection";
  }
});

// Save settings
saveBtn.addEventListener("click", async () => {
  const url = apiUrlInput.value.trim().replace(/\/+$/, "");
  if (!url) return;

  saveBtn.disabled = true;
  await setStorage({ apiUrl: url });
  saveBtn.disabled = false;

  saveStatus.classList.remove("hidden");
  setTimeout(() => {
    saveStatus.classList.add("hidden");
  }, 2500);
});

init();
