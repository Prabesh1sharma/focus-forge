# FocusForge Distraction Blocker — Chrome Extension

A Manifest V3 browser extension built with TypeScript and Chrome's DeclarativeNetRequest API, paired securely with FocusForge to enforce distraction blocking during active focus sessions.

---

## Architecture & Security Highlights

1. **Declarative Interception (Manifest V3)**:
   - Uses `chrome.declarativeNetRequest` dynamic rules.
   - Blocks top-level navigation (`main_frame`) for configured domains and their subdomains (`||domain.com^`).
   - Does not break unrelated websites or subresources.
   - Redirects blocked navigations to a branded, distraction-free FocusForge countdown screen (`/blocked.html`).

2. **Zero Leaked Secrets**:
   - The extension never accesses user session cookies, database credentials, or long-lived authentication passwords.
   - Paired via short-lived (5-minute), single-use pairing codes.
   - Stores only a narrowly-scoped, revocable API credential (`ff_ext_...`).
   - Tokens and pairing codes are hashed using SHA-256 before storage in Neon PostgreSQL.
   - Can be disconnected at any time directly from FocusForge Settings.

3. **Server-Validated Session Integrity**:
   - Session status is validated against persisted database timestamps on the server.
   - Stale or expired sessions automatically trigger rule cleanup.
   - Offline fail-safe: if the browser was closed or network disconnected when a session expired, the extension reconciles stored timestamps and immediately removes blocking rules upon startup.

4. **Privacy-First Design**:
   - Requests only minimal required permissions: `declarativeNetRequest`, `storage`, and `alarms`.
   - Never collects, inspects, or transmits browsing history.

---

## Local Development & Setup

### 1. Build the Extension
To bundle the extension TypeScript and assets into `apps/extension/dist`:

```bash
npm run build:extension
```

### 2. Load Unpacked in Google Chrome
1. Open Google Chrome and navigate to:
   ```
   chrome://extensions
   ```
2. In the top-right corner, toggle on **Developer mode**.
3. In the top-left corner, click **Load unpacked**.
4. Select the build directory:
   ```
   <repo-root>/apps/extension/dist
   ```
5. The **FocusForge Distraction Blocker** extension will appear in your extensions list.
6. Click the Extensions puzzle piece in the Chrome toolbar and pin **FocusForge**.

---

## Pairing with Your FocusForge Account

1. Start the FocusForge application:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000`.
2. Sign in and open **Settings** (`http://localhost:3000/settings`).
3. Click the **Distraction Blocking** tab.
4. Click **Connect Extension (Generate Pairing Code)**.
   - A 6-character single-use code will appear with a 5-minute countdown.
5. Click the FocusForge extension icon in your Chrome toolbar.
6. Enter the pairing code and click **Pair Extension**.
7. The popup will immediately show:
   - Connection status: **Connected as [Your Name]**
   - Live Focus timer status
   - Configured blocked websites

---

## Testing Distraction Blocking

1. In FocusForge **Settings > Distraction Blocking**, add a test site (e.g., `reddit.com` or select the **Social Media** preset).
2. Go to the **Focus Timer** page (`/focus`) and start a focus session.
3. Open a new Chrome tab and visit `https://reddit.com/`.
4. The extension automatically redirects to the FocusForge Blocked page:
   - Displays **Stay in the Zone!**
   - Shows real-time countdown timer for your active session.
   - Provides quick action links back to FocusForge.
5. When the session ends, is paused (with allow access pause policy), or is cancelled, rules are instantly lifted.

---

## Publishing to the Chrome Web Store (Optional)

When you are ready to publish the extension publicly:

1. **Create a Chrome Developer Account**:
   - Visit the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   - Sign in with your Google account and pay the one-time $5 developer registration fee.

2. **Package the Extension**:
   - Build the latest production bundle:
     ```bash
     npm run build:extension
     ```
   - Create a ZIP archive of `apps/extension/dist` (ensure `manifest.json` is at the zip root):
     ```bash
     cd apps/extension/dist && zip -r ../../../focusforge-extension.zip . && cd ../../..
     ```

3. **Upload & Publish**:
   - In the Developer Dashboard, click **New Item**.
   - Upload `focusforge-extension.zip`.
   - Fill in the required metadata:
     - **Title**: FocusForge Distraction Blocker
     - **Category**: Productivity
     - **Description**: Explanation of how the extension pairs with FocusForge to enforce distraction-free focus sessions.
     - **Permissions Justification**:
       - `declarativeNetRequest`: For high-performance, privacy-preserving blocking of distracting websites during focus sessions without reading user history.
       - `storage`: For storing local pairing credentials and domain list cache.
       - `alarms`: For periodic lightweight synchronization and session expiration checks.
     - **Privacy Policy**: Link to your privacy policy (stating no browsing history is collected).
     - **Screenshots & Icon**: Upload 1280x800 screenshots of the popup and blocked page.
   - Submit for review.
