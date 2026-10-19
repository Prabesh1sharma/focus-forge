import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

// Session check reads cookies; render at request time.
export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-0)" }}>
      {/* Desktop sidebar */}
      <Sidebar user={session.user} />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
          {children}
        </main>
      </div>

      {/* Mobile nav (bottom) */}
      <MobileNav />
    </div>
  );
}
