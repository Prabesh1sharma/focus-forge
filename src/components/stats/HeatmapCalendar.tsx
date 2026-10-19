"use client";

import { useState } from "react";
import { getHeatmapLevel, HEATMAP_COLORS_HEX } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface HeatmapDay {
  date: string;
  minutes: number;
  sessions: number;
}

interface HeatmapCalendarProps {
  data: HeatmapDay[];
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LEVEL_LABELS = ["No activity", "1–29 min", "30–59 min", "60–119 min", "120+ min"];

export default function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const [tooltip, setTooltip] = useState<{ date: string; minutes: number; sessions: number; x: number; y: number } | null>(null);

  if (data.length === 0) return null;

  // Group data by week columns
  const firstDate = parseISO(data[0].date);
  const firstDayOfWeek = firstDate.getDay(); // 0 = Sunday

  // Pad the start with empty days
  const paddedData: (HeatmapDay | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...data,
  ];

  // Split into weeks
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < paddedData.length; i += 7) {
    weeks.push(paddedData.slice(i, i + 7));
  }

  // Month labels: find where each month starts
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    for (const day of week) {
      if (day) {
        const d = parseISO(day.date);
        if (d.getMonth() !== lastMonth) {
          lastMonth = d.getMonth();
          monthLabels.push({
            label: format(d, "MMM"),
            weekIndex: wi,
          });
        }
        break;
      }
    }
  });

  const CELL_SIZE = 12;
  const CELL_GAP = 3;
  const COL_WIDTH = CELL_SIZE + CELL_GAP;

  return (
    <div style={{ overflowX: "auto", overflowY: "visible" }}>
      {/* Month labels */}
      <div style={{ display: "flex", paddingLeft: 32, marginBottom: 4, minWidth: weeks.length * COL_WIDTH + 32 }}>
        {monthLabels.map((m, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              left: m.weekIndex * COL_WIDTH,
              fontSize: 11,
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              minWidth: 30,
            }}
          >
            {m.label}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, position: "relative" }}>
        {/* Weekday labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: CELL_GAP, paddingTop: 0 }}>
          {WEEKDAY_LABELS.map((day, i) => (
            <div
              key={day}
              style={{
                height: CELL_SIZE,
                fontSize: 10,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                visibility: i % 2 === 0 ? "visible" : "hidden", // show every other
                width: 24,
                lineHeight: 1,
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          style={{
            display: "flex",
            gap: CELL_GAP,
            position: "relative",
          }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: CELL_GAP }}>
              {Array.from({ length: 7 }).map((_, di) => {
                const day = week[di];
                if (!day) {
                  return (
                    <div
                      key={di}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderRadius: 2,
                        background: "transparent",
                      }}
                    />
                  );
                }
                const level = getHeatmapLevel(day.minutes);
                const color = HEATMAP_COLORS_HEX[level];
                return (
                  <div
                    key={di}
                    className="heatmap-cell"
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: color,
                      borderRadius: 2,
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ ...day, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    aria-label={`${day.date}: ${day.minutes} minutes, ${day.sessions} sessions`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 72,
            background: "var(--surface-4)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--text-primary)",
            pointerEvents: "none",
            zIndex: 1000,
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 700 }}>{format(parseISO(tooltip.date), "MMM d, yyyy")}</div>
          <div style={{ color: "var(--text-muted)" }}>
            {tooltip.minutes > 0
              ? `${tooltip.minutes} min · ${tooltip.sessions} session${tooltip.sessions !== 1 ? "s" : ""}`
              : "No activity"}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Less</span>
        {HEATMAP_COLORS_HEX.map((color, i) => (
          <div
            key={i}
            title={LEVEL_LABELS[i]}
            style={{
              width: CELL_SIZE, height: CELL_SIZE,
              background: color, borderRadius: 2,
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>More</span>
      </div>
    </div>
  );
}
