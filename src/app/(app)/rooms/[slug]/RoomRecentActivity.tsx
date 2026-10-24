"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { formatDuration, formatDate, getInitials } from "@/lib/utils";
import { Timer, Loader2 } from "lucide-react";

export interface RoomRecentSessionItem {
  id: string;
  userId: string;
  label: string | null;
  startedAt: string;
  actualFocusSeconds: number;
  username: string;
  displayName: string;
}

interface RoomRecentActivityProps {
  roomId: string;
  initialSessions: RoomRecentSessionItem[];
  initialHasMore: boolean;
  limit?: number;
}

export default function RoomRecentActivity({
  roomId,
  initialSessions,
  initialHasMore,
  limit = 5,
}: RoomRecentActivityProps) {
  const [sessions, setSessions] = useState<RoomRecentSessionItem[]>(initialSessions);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/rooms/${roomId}/sessions?page=${nextPage}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to load more activity");
      const data = await res.json();

      setSessions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newItems = (data.sessions || []).filter(
          (s: RoomRecentSessionItem) => !existingIds.has(s.id)
        );
        return [...prev, ...newItems];
      });

      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading activity");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [roomId, hasMore, page, limit]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "150px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (sessions.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 32 }}>
        <Timer size={28} color="var(--text-muted)" />
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          No sessions yet. Be the first to focus!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {sessions.map((s) => (
          <Link
            key={s.id}
            href={`/u/${s.username}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--brand-800)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {getInitials(s.displayName)}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.displayName}
                  </span>
                  {s.label && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginLeft: 6,
                      }}
                    >
                      · {s.label}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--brand-400)",
                  }}
                >
                  {formatDuration(s.actualFocusSeconds)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {formatDate(s.startedAt, "MMM d")}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Sentinel for lazy loading on scroll */}
      {hasMore && (
        <div
          ref={sentinelRef}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 0",
            minHeight: 48,
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              <span>Loading more activity…</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={loadMore}
              className="btn-ghost"
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              Load more activity
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            textAlign: "center",
            padding: "12px 0",
            color: "#f87171",
            fontSize: 13,
          }}
        >
          {error}{" "}
          <button
            type="button"
            onClick={loadMore}
            style={{
              textDecoration: "underline",
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!hasMore && sessions.length > 5 && (
        <div
          style={{
            textAlign: "center",
            padding: "16px 0 6px",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          All {sessions.length} activities loaded
        </div>
      )}
    </div>
  );
}
