"use client";

import { useState, useEffect } from "react";
import { formatDuration, getInitials } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  totalSeconds: number;
  sessionCount: number;
}

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
] as const;

export default function RoomLeaderboard({ roomId }: { roomId: string }) {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("week");
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rooms/${roomId}/leaderboard?period=${period}`);
        const json = await res.json();
        setData(json.leaderboard ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roomId, period]);

  return (
    <div>
      {/* Period tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "var(--surface-2)", padding: 4, borderRadius: 8 }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              flex: 1, padding: "5px 4px", borderRadius: 6, border: "none",
              cursor: "pointer", fontSize: 11, fontWeight: 600,
              background: period === p.key ? "var(--surface-4)" : "transparent",
              color: period === p.key ? "var(--brand-400)" : "var(--text-muted)",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
      ) : data.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No sessions this period yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.map((entry, i) => (
            <div
              key={entry.userId}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0",
                borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {/* Rank */}
              <div style={{
                width: 22, textAlign: "center", fontSize: 13, fontWeight: 800,
                flexShrink: 0,
              }}
                className={i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : ""}
              >
                {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
              </div>

              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "var(--brand-800)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff",
                overflow: "hidden",
              }}>
                {entry.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.avatarUrl} alt={entry.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  getInitials(entry.displayName)
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.displayName}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.sessionCount} session{entry.sessionCount !== 1 ? "s" : ""}</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: entry.totalSeconds > 0 ? "var(--brand-400)" : "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
                {entry.totalSeconds > 0 ? formatDuration(entry.totalSeconds) : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
