import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
let mockSessionUser: { id: string; email?: string } | null = null;
vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(async () => {
    if (!mockSessionUser) return null;
    return { user: mockSessionUser };
  }),
}));

// Mock db
vi.mock("@/lib/db", () => {
  const queryMock = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve([])), // default not found
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => Promise.resolve([{ id: "mock-id" }])),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return { db: queryMock };
});

import { POST as pairHandler } from "@/app/api/extension/pair/route";
import { GET as syncHandler } from "@/app/api/extension/sync/route";
import { POST as addDomainHandler } from "@/app/api/settings/distraction/domains/route";
import { POST as pairingCodeHandler } from "@/app/api/extension/pairing-code/route";
import { GET as statsSessionsHandler } from "@/app/api/stats/sessions/route";
import { GET as roomSessionsHandler } from "@/app/api/rooms/[id]/sessions/route";

describe("Extension Pairing & Sync API Endpoints", () => {
  beforeEach(() => {
    mockSessionUser = null;
    vi.clearAllMocks();
  });

  it("rejects pairing request without a code", async () => {
    const req = new NextRequest("http://localhost:3000/api/extension/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await pairHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("code is required");
  });

  it("rejects non-existent or invalid pairing code", async () => {
    const req = new NextRequest("http://localhost:3000/api/extension/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "INVALID" }),
    });

    const res = await pairHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid or expired");
  });

  it("rejects sync request without authorization header", async () => {
    const req = new NextRequest("http://localhost:3000/api/extension/sync", {
      method: "GET",
    });

    const res = await syncHandler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("rejects sync request with invalid bearer token", async () => {
    const req = new NextRequest("http://localhost:3000/api/extension/sync", {
      method: "GET",
      headers: {
        Authorization: "Bearer ff_ext_fake_invalid_token_1234567890",
      },
    });

    const res = await syncHandler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("rejects domain additions from unauthenticated users", async () => {
    mockSessionUser = null; // unauthenticated
    const req = new NextRequest("http://localhost:3000/api/settings/distraction/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "youtube.com" }),
    });

    const res = await addDomainHandler(req);
    expect(res.status).toBe(401);
  });

  it("rejects invalid domain addition (malformed/IP/wildcard) for authenticated users", async () => {
    mockSessionUser = { id: "test-user-id" };

    const invalidDomains = [
      "127.0.0.1",
      "chrome://settings",
      "*.google.com",
      "not a domain",
      "co.uk",
    ];

    for (const d of invalidDomains) {
      const req = new NextRequest("http://localhost:3000/api/settings/distraction/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });

      const res = await addDomainHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    }
  });

  it("rejects pairing code generation if not authenticated", async () => {
    mockSessionUser = null;
    const res = await pairingCodeHandler();
    expect(res.status).toBe(401);
  });

  it("rejects stats sessions query if not authenticated", async () => {
    mockSessionUser = null;
    const req = new NextRequest("http://localhost:3000/api/stats/sessions?page=1&limit=5");
    const res = await statsSessionsHandler(req);
    expect(res.status).toBe(401);
  });

  it("rejects room sessions query if not authenticated", async () => {
    mockSessionUser = null;
    const req = new NextRequest("http://localhost:3000/api/rooms/room-123/sessions?page=1&limit=5");
    const res = await roomSessionsHandler(req, {
      params: Promise.resolve({ id: "room-123" }),
    });
    expect(res.status).toBe(401);
  });
});
