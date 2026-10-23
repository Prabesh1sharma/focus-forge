"use client";

import { useState } from "react";
import { LogOut, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface LeaveRoomButtonProps {
  roomId: string;
  roomName: string;
  userRole: "owner" | "admin" | "member";
}

export default function LeaveRoomButton({ roomId, roomName, userRole }: LeaveRoomButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (userRole === "owner") {
    return null; // Owners can't leave via this button (handled separately)
  }

  async function handleLeave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to leave room");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      alert("Failed to leave room");
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleLeave}
          disabled={loading}
          className="btn-danger"
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          {loading ? "Leaving…" : "Confirm Leave"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="btn-ghost"
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="btn-ghost"
      style={{ fontSize: 12, padding: "6px 12px", color: "var(--red-400)", borderColor: "var(--red-400)" }}
    >
      <LogOut size={14} /> Leave
    </button>
  );
}