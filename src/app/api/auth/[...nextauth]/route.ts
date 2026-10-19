// Auth.js handlers must be exported as functions. A bare re-export
// (`export { handlers as GET, handlers as POST }`) bundles to a non-function
// under Turbopack production builds (Next.js 16.4.2), making every
// /api/auth/* request fail with:
//   TypeError: Function.prototype.apply was called on #<Object>
// Wrapping restores correct behavior.
import { handlers } from "@/lib/auth/config";

export const GET: typeof handlers.GET = (req) => handlers.GET(req);
export const POST: typeof handlers.POST = (req) => handlers.POST(req);
