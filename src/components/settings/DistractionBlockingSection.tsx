"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Laptop,
  Key,
  Copy,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  Tv,
  Share2,
  Newspaper,
  Info,
} from "lucide-react";

interface BlockedDomainItem {
  id: string;
  domain: string;
  category: string | null;
  isEnabled: boolean;
  createdAt: string;
}

interface ExtensionDevice {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface PresetCategoryStatus {
  id: string;
  name: string;
  description: string;
  total: number;
  active: number;
  isFullyEnabled: boolean;
  isPartiallyEnabled: boolean;
}

interface DistractionSettingsData {
  isEnabled: boolean;
  scheduleMode: "focus_only" | "focus_and_breaks" | "always";
  pausePolicy: "keep_blocking" | "pause_blocking";
}

export default function DistractionBlockingSection() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState<DistractionSettingsData>({
    isEnabled: true,
    scheduleMode: "focus_only",
    pausePolicy: "keep_blocking",
  });
  const [domains, setDomains] = useState<BlockedDomainItem[]>([]);
  const [devices, setDevices] = useState<ExtensionDevice[]>([]);
  const [presetStatus, setPresetStatus] = useState<PresetCategoryStatus[]>([]);

  // Add domain form
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState("");

  // Pairing code state
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeExpiresIn, setCodeExpiresIn] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Status banners
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch distraction data
  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/distraction");
      if (!res.ok) throw new Error("Failed to load distraction settings");
      const data = await res.json();
      setSettings({
        isEnabled: data.settings.isEnabled,
        scheduleMode: data.settings.scheduleMode,
        pausePolicy: data.settings.pausePolicy,
      });
      setDomains(data.domains || []);
      setDevices(data.devices || []);
      setPresetStatus(data.presetStatus || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load distraction blocking settings.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pairing code countdown timer
  useEffect(() => {
    if (!codeExpiresIn || codeExpiresIn <= 0) return;
    const interval = setInterval(() => {
      setCodeExpiresIn((prev) => {
        if (!prev || prev <= 1) {
          setPairingCode(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [codeExpiresIn]);

  // Update global settings
  async function updateSettingField<K extends keyof DistractionSettingsData>(
    field: K,
    value: DistractionSettingsData[K]
  ) {
    const nextSettings = { ...settings, [field]: value };
    setSettings(nextSettings);
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings/distraction", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      showToast("Distraction settings updated.");
    } catch {
      showToast("Error updating settings.", "error");
      loadData();
    } finally {
      setSavingSettings(false);
    }
  }

  // Generate single-use pairing code
  async function handleGeneratePairingCode() {
    setPairingLoading(true);
    try {
      const res = await fetch("/api/extension/pairing-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate pairing code");
      setPairingCode(data.code);
      setCodeExpiresIn(data.expiresInSeconds || 300);
      setCodeCopied(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating pairing code";
      showToast(msg, "error");
    } finally {
      setPairingLoading(false);
    }
  }

  // Copy pairing code
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  // Disconnect extension device
  async function handleDisconnectDevice(deviceId: string) {
    if (!confirm("Are you sure you want to disconnect this extension?")) return;
    try {
      const res = await fetch(`/api/settings/distraction/devices/${deviceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect device");
      showToast("Extension disconnected.");
      loadData();
    } catch {
      showToast("Failed to disconnect extension.", "error");
    }
  }

  // Add domain
  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setAddingDomain(true);
    setDomainError("");
    try {
      const res = await fetch("/api/settings/distraction/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim(), category: "custom" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDomainError(data.error || "Failed to add domain.");
        return;
      }
      setNewDomain("");
      showToast(`Added ${data.domain.domain} to blocklist.`);
      loadData();
    } catch {
      setDomainError("Failed to reach server.");
    } finally {
      setAddingDomain(false);
    }
  }

  // Toggle domain enabled
  async function handleToggleDomain(domainId: string, currentEnabled: boolean) {
    const nextVal = !currentEnabled;
    setDomains((prev) =>
      prev.map((d) => (d.id === domainId ? { ...d, isEnabled: nextVal } : d))
    );
    try {
      const res = await fetch(`/api/settings/distraction/domains/${domainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: nextVal }),
      });
      if (!res.ok) throw new Error();
    } catch {
      showToast("Failed to update domain status.", "error");
      loadData();
    }
  }

  // Delete domain
  async function handleDeleteDomain(domainId: string, domainName: string) {
    try {
      const res = await fetch(`/api/settings/distraction/domains/${domainId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      showToast(`Removed ${domainName} from blocklist.`);
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
      loadData();
    } catch {
      showToast("Failed to delete domain.", "error");
    }
  }

  // Toggle preset category
  async function handleTogglePreset(categoryKey: string, isCurrentlyEnabled: boolean) {
    try {
      const action = isCurrentlyEnabled ? "remove" : "add";
      const res = await fetch("/api/settings/distraction/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryKey, action }),
      });
      if (!res.ok) throw new Error();
      showToast(
        action === "add"
          ? `Added preset sites to blocklist.`
          : `Removed preset sites from blocklist.`
      );
      loadData();
    } catch {
      showToast("Failed to update preset category.", "error");
    }
  }

  const getPresetIcon = (id: string) => {
    switch (id) {
      case "social_media":
        return <Share2 size={18} className="text-pink-400" />;
      case "entertainment":
        return <Tv size={18} className="text-purple-400" />;
      case "news":
        return <Newspaper size={18} className="text-amber-400" />;
      default:
        return <Globe size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading Distraction Blocking settings...</p>
      </div>
    );
  }

  const isExtensionConnected = devices.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: "12px 18px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            background:
              toastMessage.type === "success"
                ? "rgba(16,185,129,0.95)"
                : "rgba(239,68,68,0.95)",
            color: "#fff",
            backdropFilter: "blur(6px)",
          }}
        >
          {toastMessage.type === "success" ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* Main Feature Toggle */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: settings.isEnabled ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: settings.isEnabled ? "var(--brand-400)" : "var(--text-muted)",
              }}
            >
              {settings.isEnabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Distraction Blocking
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "3px 0 0" }}>
                {settings.isEnabled
                  ? "Distraction blocking is active according to your schedule policy."
                  : "Distraction blocking is temporarily turned off."}
              </p>
            </div>
          </div>

          <label style={{ position: "relative", display: "inline-block", width: 48, height: 26 }}>
            <input
              type="checkbox"
              checked={settings.isEnabled}
              disabled={savingSettings}
              onChange={(e) => updateSettingField("isEnabled", e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: "absolute",
                cursor: "pointer",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.isEnabled ? "var(--brand-500, #10b981)" : "#374151",
                transition: "0.2s",
                borderRadius: 26,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  content: '""',
                  height: 20,
                  width: 20,
                  left: settings.isEnabled ? 25 : 3,
                  bottom: 3,
                  backgroundColor: "white",
                  transition: "0.2s",
                  borderRadius: "50%",
                }}
              />
            </span>
          </label>
        </div>
      </div>

      {/* Extension Connection & Synchronization Status */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Laptop size={18} style={{ color: isExtensionConnected ? "#10b981" : "#f59e0b" }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Browser Extension Connection
            </h2>
          </div>
          <span
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 20,
              fontWeight: 600,
              background: isExtensionConnected ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
              color: isExtensionConnected ? "#34d399" : "#fbbf24",
            }}
          >
            {isExtensionConnected ? "● Connected & Synchronized" : "○ Disconnected"}
          </span>
        </div>

        {!isExtensionConnected ? (
          <div
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              <AlertCircle size={20} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                  <strong>Extension Not Connected.</strong> Distraction blocking requires the FocusForge
                  Chrome extension to intercept and block distracting websites in your browser.
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.4 }}>
                  Install the FocusForge extension, click <strong>Connect Extension</strong> below to obtain a
                  secure single-use pairing code, and enter it into the extension popup.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Your browser extension is paired and syncing blocking rules dynamically based on your FocusForge sessions.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {devices.map((device) => (
                <div
                  key={device.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--bg-card-hover, rgba(255,255,255,0.03))",
                    borderRadius: 8,
                    border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Shield size={16} style={{ color: "#10b981" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {device.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Connected {new Date(device.createdAt).toLocaleDateString()}
                        {device.lastUsedAt && ` • Synced ${new Date(device.lastUsedAt).toLocaleTimeString()}`}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDisconnectDevice(device.id)}
                    className="btn-ghost"
                    style={{ color: "#f87171", fontSize: 12, padding: "5px 10px" }}
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pairing Code Generator Card */}
        {pairingCode ? (
          <div
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 8,
              padding: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--brand-400)" }}>
                Single-Use Pairing Code
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Expires in {Math.floor((codeExpiresIn || 0) / 60)}:
                {String((codeExpiresIn || 0) % 60).padStart(2, "0")}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: 4,
                  fontFamily: "monospace",
                  background: "rgba(0,0,0,0.4)",
                  padding: "10px 16px",
                  borderRadius: 6,
                  textAlign: "center",
                  color: "#fff",
                }}
              >
                {pairingCode}
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== "undefined" ? window.location.origin : "";
                  copyToClipboard(url ? `${pairingCode}@${url}` : pairingCode);
                }}
                className="btn-secondary"
                style={{ padding: "12px 16px", fontSize: 12 }}
                title="Copies code with current server URL for instant 1-click pairing"
              >
                {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                {codeCopied ? "Copied" : "Copy Code"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
              <span>Server: <code style={{ color: "var(--brand-400)" }}>{typeof window !== "undefined" ? window.location.origin : ""}</code></span>
              <span>Paste into the extension popup to connect.</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGeneratePairingCode}
            disabled={pairingLoading}
            className="btn-secondary"
            style={{ fontSize: 13, width: "100%", justifyContent: "center" }}
          >
            <Key size={14} />
            {pairingLoading ? "Generating Code..." : isExtensionConnected ? "Pair Another Browser / Device" : "Connect Extension (Generate Pairing Code)"}
          </button>
        )}
      </div>

      {/* Blocking Schedule & Policies */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16 }}>
          Blocking Schedule & Policy
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label" style={{ marginBottom: 8, display: "block" }}>
              When should blocking be enforced?
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                {
                  id: "focus_only",
                  title: "Focus Sessions Only",
                  desc: "Active only during focus countdowns",
                },
                {
                  id: "focus_and_breaks",
                  title: "Focus & Breaks",
                  desc: "Active during focus and rest intervals",
                },
                {
                  id: "always",
                  title: "Always Blocked",
                  desc: "Continuous blocking at all times",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    updateSettingField("scheduleMode", opt.id as DistractionSettingsData["scheduleMode"])
                  }
                  style={{
                    padding: "12px",
                    borderRadius: 8,
                    textAlign: "left",
                    cursor: "pointer",
                    border:
                      settings.scheduleMode === opt.id
                        ? "1px solid var(--brand-500, #10b981)"
                        : "1px solid var(--border-color, rgba(255,255,255,0.08))",
                    background:
                      settings.scheduleMode === opt.id
                        ? "rgba(16,185,129,0.12)"
                        : "var(--bg-card-hover, rgba(255,255,255,0.02))",
                    transition: "0.15s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: settings.scheduleMode === opt.id ? "var(--brand-400)" : "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {opt.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" style={{ marginBottom: 8, display: "block" }}>
              Pause Policy (when a session is paused)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                {
                  id: "keep_blocking",
                  title: "Keep Blocking",
                  desc: "Sites stay blocked while timer is paused",
                },
                {
                  id: "pause_blocking",
                  title: "Allow Access",
                  desc: "Temporarily lift blocking while timer is paused",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    updateSettingField("pausePolicy", opt.id as DistractionSettingsData["pausePolicy"])
                  }
                  style={{
                    padding: "12px",
                    borderRadius: 8,
                    textAlign: "left",
                    cursor: "pointer",
                    border:
                      settings.pausePolicy === opt.id
                        ? "1px solid var(--brand-500, #10b981)"
                        : "1px solid var(--border-color, rgba(255,255,255,0.08))",
                    background:
                      settings.pausePolicy === opt.id
                        ? "rgba(16,185,129,0.12)"
                        : "var(--bg-card-hover, rgba(255,255,255,0.02))",
                    transition: "0.15s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: settings.pausePolicy === opt.id ? "var(--brand-400)" : "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {opt.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preset Categories */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", margin: 0 }}>
            Preset Blocklist Categories
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Quickly block commonly distracting services with one click.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {presetStatus.map((preset) => (
            <div
              key={preset.id}
              style={{
                border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                borderRadius: 8,
                padding: 16,
                background: preset.isFullyEnabled
                  ? "rgba(16,185,129,0.06)"
                  : "var(--bg-card-hover, rgba(255,255,255,0.02))",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  {getPresetIcon(preset.id)}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: preset.isFullyEnabled ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)",
                      color: preset.isFullyEnabled ? "var(--brand-400)" : "var(--text-muted)",
                    }}
                  >
                    {preset.active} / {preset.total}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  {preset.name}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  {preset.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePreset(preset.id, preset.isFullyEnabled)}
                className={preset.isFullyEnabled ? "btn-secondary" : "btn-primary"}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                {preset.isFullyEnabled ? "Remove Category" : "Block Category"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Domain Blocklist Management */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", margin: 0 }}>
              Blocked Websites ({domains.length})
            </h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {domains.filter((d) => d.isEnabled).length} active
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Subdomains (e.g. <code>old.reddit.com</code>) are automatically protected when blocking a root domain.
          </p>
        </div>

        {/* Add Domain Form */}
        <form onSubmit={handleAddDomain} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                className="input"
                placeholder="Enter domain (e.g. reddit.com, youtube.com)"
                value={newDomain}
                onChange={(e) => {
                  setNewDomain(e.target.value);
                  if (domainError) setDomainError("");
                }}
                disabled={addingDomain}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={addingDomain || !newDomain.trim()}
              style={{ padding: "0 18px", fontSize: 13 }}
            >
              <Plus size={16} />
              {addingDomain ? "Adding..." : "Add Website"}
            </button>
          </div>
          {domainError && (
            <div
              style={{
                color: "#f87171",
                fontSize: 12,
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertCircle size={14} />
              {domainError}
            </div>
          )}
        </form>

        {/* Domain List */}
        {domains.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 8,
              border: "1px dashed var(--border-color, rgba(255,255,255,0.08))",
            }}
          >
            <Globe size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
              No websites blocked yet. Add your first domain above or select a preset category.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 360,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {domains.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: item.isEnabled
                    ? "var(--bg-card-hover, rgba(255,255,255,0.03))"
                    : "rgba(255,255,255,0.01)",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.06))",
                  opacity: item.isEnabled ? 1 : 0.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Globe
                    size={16}
                    style={{ color: item.isEnabled ? "var(--brand-400)" : "var(--text-muted)" }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textDecoration: item.isEnabled ? "none" : "line-through",
                      }}
                    >
                      {item.domain}
                    </span>
                    {item.category && item.category !== "custom" && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {item.category.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Enable / Disable Switch */}
                  <label style={{ position: "relative", display: "inline-block", width: 36, height: 20 }}>
                    <input
                      type="checkbox"
                      checked={item.isEnabled}
                      onChange={() => handleToggleDomain(item.id, item.isEnabled)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: item.isEnabled ? "var(--brand-500, #10b981)" : "#374151",
                        transition: "0.2s",
                        borderRadius: 20,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          content: '""',
                          height: 14,
                          width: 14,
                          left: item.isEnabled ? 19 : 3,
                          bottom: 3,
                          backgroundColor: "white",
                          transition: "0.2s",
                          borderRadius: "50%",
                        }}
                      />
                    </span>
                  </label>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteDomain(item.id, item.domain)}
                    className="btn-ghost"
                    style={{ color: "var(--text-muted)", padding: 6 }}
                    title="Remove domain"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informational Disclaimer */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "14px 18px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border-color, rgba(255,255,255,0.06))",
        }}
      >
        <Info size={18} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          Distraction blocking operates client-side via declarative rules in the FocusForge Chrome extension.
          It does not collect or transmit your browsing history. Blocking is enforced only on browsers where
          the extension is installed and paired, and can be bypassed by turning off the extension.
        </p>
      </div>
    </div>
  );
}
