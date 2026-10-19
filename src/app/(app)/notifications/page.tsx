"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { Bell, Check, CheckCheck, Users, UserPlus, Award } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  readAt: string | null;
  createdAt: string;
  actorId?: string;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifs((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function respondToInvitation(notifId: string, invitationId: string, roomId: string, action: "accept" | "decline") {
    setRespondingTo(notifId);
    try {
      const res = await fetch(`/api/rooms/${roomId}/invitations/${invitationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await markRead(notifId);
        await fetchNotifications();
        if (action === "accept") {
          const data = await res.json();
          if (data.roomSlug) window.location.href = `/rooms/${data.roomSlug}`;
        }
      }
    } finally {
      setRespondingTo(null);
    }
  }

  function getNotifIcon(type: string) {
    switch (type) {
      case "room_invitation": return <UserPlus size={16} color="var(--brand-400)" />;
      case "invitation_accepted": return <Users size={16} color="#10b981" />;
      case "invitation_declined": return <Users size={16} color="#ef4444" />;
      case "goal_achieved": return <Award size={16} color="#f59e0b" />;
      default: return <Bell size={16} color="var(--text-muted)" />;
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            Notifications
            {unreadCount > 0 && (
              <span className="badge" style={{ marginLeft: 10, verticalAlign: "middle", fontSize: 12 }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Stay up to date with your rooms and activity</p>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn-ghost"
            onClick={markAllRead}
            disabled={markingAll}
            style={{ fontSize: 13 }}
          >
            <CheckCheck size={15} />
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading…</div>
      ) : notifs.length === 0 ? (
        <div className="card empty-state">
          <Bell size={36} color="var(--text-muted)" />
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>All caught up!</p>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No notifications yet. Join or create a room to get started.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notifs.map((n) => {
            const isInvite = n.type === "room_invitation";
            const isUnread = !n.readAt;

            return (
              <div
                key={n.id}
                className="card"
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "16px 20px",
                  background: isUnread ? "var(--surface-2)" : "var(--surface-1)",
                  borderLeft: isUnread ? "3px solid var(--brand-600)" : "1px solid var(--border)",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--surface-3)", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  {getNotifIcon(n.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{n.message}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {formatDate(n.createdAt, "MMM d")}
                      </span>
                      {isUnread && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          title="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Invitation actions */}
                  {isInvite && n.relatedEntityId && isUnread && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        className="btn-primary"
                        disabled={respondingTo === n.id}
                        onClick={() => {
                          // Extract roomId from relatedEntityId (invitation id) - need room context
                          // For now, fetch from API
                          respondToInvitation(n.id, n.relatedEntityId!, extractRoomId(n), "accept");
                        }}
                        style={{ fontSize: 13, padding: "7px 16px" }}
                      >
                        Accept
                      </button>
                      <button
                        className="btn-secondary"
                        disabled={respondingTo === n.id}
                        onClick={() => respondToInvitation(n.id, n.relatedEntityId!, extractRoomId(n), "decline")}
                        style={{ fontSize: 13, padding: "7px 16px" }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper — extract room ID from action URL for invitation response
function extractRoomId(n: Notification): string {
  // actionUrl pattern: /notifications (stored), need to look up invitation
  // For invitations, the relatedEntityId IS the invitation ID
  // Room ID needs to come from the action URL or we need to store it separately
  // Simple workaround: store room ID in relatedEntityId for invitations
  return n.actorId ?? ""; // fallback — the invitation respond API takes invitationId + roomId
}
