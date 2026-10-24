"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatDuration, formatDate } from "@/lib/utils";
import { Timer, Loader2 } from "lucide-react";

export interface RecentSessionItem {
  id: string;
  label: string | null;
  startedAt: string;
  actualFocusSeconds: number;
}

interface RecentSessionsListProps {
  initialSessions: RecentSessionItem[];
  initialHasMore: boolean;
  limit?: number;
}

export default function RecentSessionsList({
  initialSessions,
  initialHasMore,
  limit = 5,
}: RecentSessionsListProps) {
  const [sessions, setSessions] = useState<RecentSessionItem[]>(initialSessions);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/stats/sessions?page=${nextPage}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to load more sessions");
      const data = await res.json();

      setSessions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newItems = (data.sessions || []).filter(
          (s: RecentSessionItem) => !existingIds.has(s.id)
        );
        return [...prev, ...newItems];
      });

      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading sessions");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, page, limit]);

  // IntersectionObserver watching sentinel inside scrollable container
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: container,
        rootMargin: "50px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // Direct onScroll handler for guaranteed lazy-loading when scrolling container
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 60 && hasMore && !loadingRef.current) {
        loadMore();
      }
    },
    [hasMore, loadMore]
  );

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <Timer size={32} color="var(--text-muted)" />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          No completed sessions yet. Start your first focus session!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        maxHeight: 290,
        overflowY: "auto",
        paddingRight: 6,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {sessions.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {s.label || "Focus Session"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {formatDate(s.startedAt)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--brand-400)",
                }}
              >
                {formatDuration(s.actualFocusSeconds)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sentinel for lazy loading on scroll inside container */}
      {hasMore && (
        <div
          ref={sentinelRef}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 0",
            minHeight: 40,
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span>Loading more sessions…</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={loadMore}
              className="btn-ghost"
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              Load more
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            textAlign: "center",
            padding: "10px 0",
            color: "#f87171",
            fontSize: 12,
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
            padding: "12px 0 4px",
            color: "var(--text-muted)",
            fontSize: 11,
          }}
        >
          All {sessions.length} sessions loaded
        </div>
      )}
    </div>
  );
}
