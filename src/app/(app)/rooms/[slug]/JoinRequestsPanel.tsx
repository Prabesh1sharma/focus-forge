"use client";

import { useState } from "react";
import { UserPlus, UserCheck, UserX, Clock, AlertCircle } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface JoinRequest {
  id: string;
  userId: string;
  createdAt: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface JoinRequestsPanelProps {
  requests: JoinRequest[];
  roomId: string;
}

export default function JoinRequestsPanel({ requests, roomId }: JoinRequestsPanelProps) {
  const [responding, setResponding] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, "accepted" | "declined">>({});

  async function handleRespond(requestId: string, action: "accept" | "decline") {
    setResponding(requestId);
    try {
      const res = await fetch(`/api/join-requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || `Failed to ${action} request`);
        return;
      }
      const resultStatus = action === "accept" ? "accepted" : "declined";
      setResults((prev) => ({ ...prev, [requestId]: resultStatus }));
    } catch (err) {
      alert(`Failed to ${action} request`);
    } finally {
      setResponding(null);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="card" style={{ border: "1px solid rgba(16,185,129,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <UserPlus size={15} color="var(--brand-400)" /> Join Requests
        </h2>
        <span style={{ fontSize: 11, background: "rgba(16,185,129,0.15)", color: "var(--brand-400)", padding: "2px 8px", borderRadius: 4 }}>
          {requests.length} pending
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {requests.map((request) => {
          const result = results[request.id];
          const isResponding = responding === request.id;

          if (result) {
            return (
              <div key={request.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 10, opacity: 0.7 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {getInitials(request.displayName)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{request.displayName}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{request.username}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: result === "accepted" ? "var(--brand-400)" : "var(--red-400)", display: "flex", alignItems: "center", gap: 4 }}>
                  {result === "accepted" ? <UserCheck size={12} /> : <UserX size={12} />}
                  {result === "accepted" ? "Accepted" : "Declined"}
                </span>
              </div>
            );
          }

          return (
            <div key={request.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {getInitials(request.displayName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{request.displayName}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>@{request.username}</span>
                  <Clock size={10} color="var(--text-muted)" />
                  <span>{formatDate(request.createdAt)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn-primary"
                  disabled={isResponding}
                  onClick={() => handleRespond(request.id, "accept")}
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  {isResponding ? "…" : <><UserCheck size={14} /> Accept</>}
                </button>
                <button
                  className="btn-secondary"
                  disabled={isResponding}
                  onClick={() => handleRespond(request.id, "decline")}
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  {isResponding ? "…" : <><UserX size={14} /> Decline</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}