"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { getInitials, getAvatarUrl } from "@/lib/utils";
import {
  LayoutDashboard,
  Timer,
  BarChart2,
  Bell,
  User,
  Settings,
  LogOut,
  Sword,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    onboardingCompleted: boolean;
  };
}

const navLinks = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Rooms" },
  { href: "/focus", icon: Timer, label: "Focus" },
  { href: "/stats", icon: BarChart2, label: "Statistics" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <aside
      className="hidden md:flex"
      style={{
        width: 240,
        flexDirection: "column",
        background: "var(--surface-1)",
        borderRight: "1px solid var(--border)",
        padding: "20px 12px",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", marginBottom: 24 }}>
        <div style={{ width: 28, height: 28, background: "#059669", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sword size={16} color="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>FocusForge</span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {navLinks.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Notifications" && (
                <span id="sidebar-notif-count" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
        <Link
          href="/profile"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 8, textDecoration: "none",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--brand-700)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff",
              flexShrink: 0, overflow: "hidden",
            }}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              getInitials(user.displayName)
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              @{user.username}
            </div>
          </div>
        </Link>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="sidebar-link"
          style={{ width: "100%", border: "none", background: "none", cursor: "pointer", marginTop: 2 }}
        >
          <LogOut size={16} />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );
}
