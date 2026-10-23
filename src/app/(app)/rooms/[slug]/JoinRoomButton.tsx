"use client";

import { useState } from "react";
import { UserPlus, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface JoinRoomButtonProps {
  roomId: string;
}

export default function JoinRoomButton({ roomId }: JoinRoomButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  async function handleJoin() {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/join-request`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to join room");
        return;
      }
      if (data.status === "joined") {
        setJoined(true);
        router.refresh();
      }
    } catch (err) {
      alert("Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  if (joined) {
    return (
      <span className="btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>
        <Check size={14} /> Joined
      </span>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="btn-primary"
      style={{ fontSize: 12, padding: "6px 12px" }}
    >
      {loading ? "Joining…" : <><UserPlus size={14} /> Join</>}
    </button>
  );
}