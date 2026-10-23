"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Users, Lock, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarColor: string;
  visibility: "public" | "private";
  createdBy: string;
  createdAt: string;
  memberCount?: number;
  isMember?: boolean;
  hasRequested?: boolean;
}

export default function ExploreRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");

  useEffect(() => {
    fetchRooms();
  }, [filter]);

  async function fetchRooms() {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.description?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || room.visibility === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse" style={{ padding: 20 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--surface-3)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 16, background: "var(--surface-3)", borderRadius: 4, width: "60%" }} />
                  <div style={{ height: 12, background: "var(--surface-3)", borderRadius: 4, width: "40%", marginTop: 8 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Explore Rooms
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Find accountability spaces to focus with others
          </p>
        </div>
        <Link href="/rooms/new" className="btn-primary" style={{ fontSize: 14, padding: "10px 18px" }}>
          <Plus size={16} /> Create Room
        </Link>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="input"
              placeholder="Search rooms by name or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, background: "var(--surface-2)", padding: 4, borderRadius: 8 }}>
            {(["all", "public", "private"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={filter === f ? "btn-primary" : "btn-ghost"}
                style={{ fontSize: 12, padding: "6px 14px", whiteSpace: "nowrap" }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <Users size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            No rooms found
          </h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
            {search || filter !== "all"
              ? "Try adjusting your search or filter"
              : "No public rooms exist yet. Be the first to create one!"}
          </p>
          {(!search && filter === "all") && (
            <Link href="/rooms/new" className="btn-primary" style={{ display: "inline-flex" }}>
              <Plus size={16} /> Create Room
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredRooms.map((room) => (
            <div key={room.id} style={{ textDecoration: "none" }}>
              <div className="card" style={{ display: "flex", gap: 16, padding: 20, transition: "background 0.2s" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: room.avatarColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0,
                }}>
                  {room.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <Link href={`/rooms/${room.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                        {room.name}
                      </h3>
                    </Link>
                    <span style={{ fontSize: 10, background: room.visibility === "private" ? "rgba(168,85,247,0.15)" : "rgba(16,185,129,0.15)", color: room.visibility === "private" ? "var(--purple-400)" : "var(--brand-400)", padding: "2px 8px", borderRadius: 4 }}>
                      {room.visibility === "private" ? <Lock size={10} /> : <ExternalLink size={10} />}
                      {room.visibility}
                    </span>
                  </div>
                  {room.description && (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {room.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Users size={12} /> {room.memberCount ?? 0} members
                    </span>
                    <span>Created {formatDate(room.createdAt, "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}