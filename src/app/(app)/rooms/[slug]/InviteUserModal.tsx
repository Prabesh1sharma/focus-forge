"use client";

import { useState } from "react";
import { UserPlus, Search, X } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export default function InviteUserModal({ roomId }: { roomId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.users ?? []);
    } finally {
      setSearching(false);
    }
  }

  async function handleInvite(user: User) {
    setInviting(user.id);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send invitation");
      } else {
        setInvited((prev) => new Set([...prev, user.id]));
      }
    } finally {
      setInviting(null);
    }
  }

  return (
    <>
      <button
        className="btn-secondary"
        onClick={() => setOpen(true)}
        style={{ fontSize: 13, padding: "8px 14px" }}
      >
        <UserPlus size={14} /> Invite
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.7)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="animate-fade-in" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Invite to Room
              </h2>
              <button onClick={() => setOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                className="input"
                placeholder="Search by username…"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ paddingLeft: 40 }}
                autoFocus
              />
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 12 }}>
                {error}
              </div>
            )}

            {/* Results */}
            {searching ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Searching…</div>
            ) : results.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map((user) => (
                  <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {getInitials(user.displayName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user.displayName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{user.username}</div>
                    </div>
                    {invited.has(user.id) ? (
                      <span style={{ fontSize: 12, color: "var(--brand-400)", fontWeight: 600 }}>✓ Invited</span>
                    ) : (
                      <button
                        className="btn-primary"
                        disabled={inviting === user.id}
                        onClick={() => handleInvite(user)}
                        style={{ fontSize: 12, padding: "6px 14px" }}
                      >
                        {inviting === user.id ? "…" : "Invite"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No users found for &quot;{query}&quot;
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Type a username to search
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
