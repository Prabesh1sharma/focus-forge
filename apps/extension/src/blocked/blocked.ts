import { ExtensionStorage } from "../shared/types";

const sessionLabel = document.getElementById("sessionLabel")!;
const timerCountdown = document.getElementById("timerCountdown")!;
const timerSubtext = document.getElementById("timerSubtext")!;
const openFocusBtn = document.getElementById("openFocusBtn") as HTMLButtonElement;
const openSettingsBtn = document.getElementById("openSettingsBtn") as HTMLButtonElement;
const motivationalQuote = document.getElementById("motivationalQuote")!;
const quoteAuthor = document.getElementById("quoteAuthor")!;

const QUOTES = [
  {
    text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.",
    author: "Alexander Graham Bell",
  },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
  },
  {
    text: "Deep work is the ability to focus without distraction on a cognitively demanding task.",
    author: "Cal Newport",
  },
  {
    text: "The successful warrior is the average person, with laser-like focus.",
    author: "Bruce Lee",
  },
  {
    text: "Starve your distractions, feed your focus.",
    author: "Unknown",
  },
];

let remainingSeconds = 0;
let timerInterval: number | null = null;
let currentAppUrl = "http://localhost:3000";

function formatCountdown(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateBlockedUI(storage: ExtensionStorage) {
  if (storage.apiUrl) {
    currentAppUrl = storage.apiUrl.replace(/\/+$/, "");
  }

  const session = storage.activeSession;
  if (session) {
    sessionLabel.textContent = session.label
      ? `Focus Session: ${session.label}`
      : "Active Focus Session";

    remainingSeconds = session.remainingSeconds ?? 0;
    timerCountdown.textContent = formatCountdown(remainingSeconds);

    if (session.status === "paused") {
      timerSubtext.textContent = "Timer is paused";
      timerCountdown.style.color = "#fbbf24";
    } else {
      timerSubtext.textContent = "remaining in this focus interval";
      timerCountdown.style.color = "#fff";

      if (timerInterval) clearInterval(timerInterval);
      timerInterval = window.setInterval(() => {
        remainingSeconds -= 1;
        if (remainingSeconds <= 0) {
          remainingSeconds = 0;
          timerCountdown.textContent = "00:00";
          timerSubtext.textContent = "Session finished! Refreshing...";
          if (timerInterval) clearInterval(timerInterval);
          return;
        }
        timerCountdown.textContent = formatCountdown(remainingSeconds);
      }, 1000);
    }
  } else {
    sessionLabel.textContent = "Focus Protection";
    timerCountdown.textContent = "ACTIVE";
    timerSubtext.textContent = "Distraction blocking is configured to stay enabled";
  }
}

// Random focus quote
const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
motivationalQuote.textContent = `"${randomQuote.text}"`;
quoteAuthor.textContent = `— ${randomQuote.author}`;

// Load state from chrome.storage
if (typeof chrome !== "undefined" && chrome.storage?.local) {
  chrome.storage.local.get(null, (result) => {
    updateBlockedUI(result as unknown as ExtensionStorage);
  });
}

openFocusBtn.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.create({ url: `${currentAppUrl}/focus` });
  } else {
    window.location.href = `${currentAppUrl}/focus`;
  }
});

openSettingsBtn.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.create({ url: `${currentAppUrl}/settings` });
  } else {
    window.location.href = `${currentAppUrl}/settings`;
  }
});
