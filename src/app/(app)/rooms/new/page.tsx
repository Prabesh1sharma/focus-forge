"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const AVATAR_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];

export default function NewRoomPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    avatarColor: "#10b981",
    visibility: "public" as "public" | "private",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors?.fieldErrors ?? { general: data.error || "Failed to create room" });
        return;
      }

      router.push(`/rooms/${data.room.slug}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <Link href="/dashboard" className="btn-ghost" style={{ marginBottom: 24, display: "inline-flex", fontSize: 13 }}>
        <ChevronLeft size={15} /> Back to dashboard
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
        Create a Room
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>
        Create an accountability space to focus with others.
      </p>

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {errors.general && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#f87171" }}>
              {errors.general}
            </div>
          )}

          {/* Avatar color picker */}
          <div className="form-group">
            <label className="label">Room Color</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, avatarColor: color }))}
                  style={{
                    width: 32, height: 32, borderRadius: 8, background: color,
                    border: form.avatarColor === color ? "3px solid #fff" : "3px solid transparent",
                    cursor: "pointer",
                    boxShadow: form.avatarColor === color ? `0 0 0 2px ${color}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: form.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>
              {form.name.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{form.name || "Room Name"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{form.description || "Room description"}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="room-name">Room Name *</label>
            <input
              id="room-name"
              type="text"
              className="input"
              placeholder="Morning Study Squad"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={50}
              required
            />
            {errors.name && <p className="error-text">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="room-desc">Description</label>
            <textarea
              id="room-desc"
              className="input"
              placeholder="A room for morning study sessions…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={200}
              rows={3}
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="form-group">
            <label className="label">Visibility</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["public", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visibility: v }))}
                  className={form.visibility === v ? "btn-primary" : "btn-secondary"}
                  style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "9px" }}
                >
                  {v === "public" ? "🌐 Public" : "🔒 Private"}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {form.visibility === "public"
                ? "Anyone can discover this room"
                : "Only invited members can join"}
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15, marginTop: 4 }}
          >
            {loading ? "Creating room…" : "Create Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
