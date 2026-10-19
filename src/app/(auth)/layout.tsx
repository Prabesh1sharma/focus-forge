import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

// Session check reads cookies; render at request time.
export const instant = false;

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");
  
  return <>{children}</>;
}
