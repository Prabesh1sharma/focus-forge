"use client";

import { useState } from "react";
import { UserPlus, Check, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface JoinRoomButtonProps {
  roomId: string;
}

export default function JoinRoomButton({ roomId }: JoinRoomButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "requested">("idle");

  async function handleJoin() {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/join-request`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send join request");
        return;
      }
      if (data.status === "requested") {
        setStatus("requested");
        router.refresh();
      }
    } catch (err) {
      alert("Failed to send join request");
    } finally {
      setLoading(false);
    }
  }

  if (status === "requested") {
    return (
      <span className="btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>
        <Clock size={14} /> Request Sent
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
      {loading ? "Sending…" : <><UserPlus size={14} /> Request Join</>}
    </button>
  );
}