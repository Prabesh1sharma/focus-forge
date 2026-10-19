"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Timer, BarChart2, Bell, User } from "lucide-react";

const mobileLinks = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Rooms" },
  { href: "/focus", icon: Timer, label: "Focus" },
  { href: "/stats", icon: BarChart2, label: "Stats" },
  { href: "/notifications", icon: Bell, label: "Alerts" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--surface-1)", borderTop: "1px solid var(--border)",
        display: "flex",
      }}
    >
      {mobileLinks.map(({ href, icon: Icon, label }) => {
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "10px 4px 16px",
              color: active ? "var(--brand-400)" : "var(--text-muted)",
              textDecoration: "none", fontSize: 10, fontWeight: 500, gap: 3,
              transition: "color 0.15s",
            }}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
