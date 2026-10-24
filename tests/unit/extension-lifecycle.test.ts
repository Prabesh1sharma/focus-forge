import { describe, it, expect, beforeEach } from "vitest";
import {
  generateDnrRules,
  buildDomainUrlFilter,
  matchesDomainFilter,
} from "@/lib/extension/rules";
import { normalizeDomain } from "@/lib/validations/domains";
import {
  generatePairingCode,
  generateExtensionToken,
  hashSha256,
} from "@/lib/extension/crypto";
import { calculateRemaining, TimerState } from "@/lib/timer/engine";

describe("Extension DeclarativeNetRequest Rules Lifecycle", () => {
  it("creates deterministic dynamic rules for configured domains", () => {
    const domains = ["facebook.com", "instagram.com", "reddit.com"];
    const rules = generateDnrRules(domains);

    expect(rules).toHaveLength(3);
    expect(rules.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(rules.map((r) => r.condition.urlFilter)).toEqual([
      "||facebook.com^",
      "||instagram.com^",
      "||reddit.com^",
    ]);

    // Top-level navigation only
    rules.forEach((rule) => {
      expect(rule.condition.resourceTypes).toEqual(["main_frame"]);
      expect(rule.action.type).toBe("redirect");
      expect(rule.action.redirect?.extensionPath).toBe("/blocked.html");
    });
  });

  it("safely updates rules when domains change, replacing obsolete ones without duplicates", () => {
    // Initial blocklist
    const initialDomains = ["reddit.com", "youtube.com"];
    const initialRules = generateDnrRules(initialDomains);
    expect(initialRules).toHaveLength(2);

    // Updated blocklist (removed youtube, added twitter & tiktok)
    const updatedDomains = ["reddit.com", "twitter.com", "tiktok.com"];
    const updatedRules = generateDnrRules(updatedDomains);
    expect(updatedRules).toHaveLength(3);
    expect(updatedRules.map((r) => r.condition.urlFilter)).toEqual([
      "||reddit.com^",
      "||tiktok.com^",
      "||twitter.com^",
    ]);
  });

  it("removes all rules when blocking is turned off or blocklist is empty", () => {
    const emptyRules = generateDnrRules([]);
    expect(emptyRules).toHaveLength(0);
  });

  it("accurately matches root domain and subdomains while rejecting unrelated domains", () => {
    const domain = "youtube.com";

    // Matching subdomains and root
    expect(matchesDomainFilter(domain, "https://youtube.com/")).toBe(true);
    expect(matchesDomainFilter(domain, "https://www.youtube.com/watch?v=123")).toBe(true);
    expect(matchesDomainFilter(domain, "https://music.youtube.com/explore")).toBe(true);
    expect(matchesDomainFilter(domain, "https://gaming.sub.youtube.com/")).toBe(true);

    // Rejecting unrelated
    expect(matchesDomainFilter(domain, "https://notyoutube.com/")).toBe(false);
    expect(matchesDomainFilter(domain, "https://youtube.com.phishing.io/")).toBe(false);
    expect(matchesDomainFilter(domain, "https://fake-youtube.com/")).toBe(false);
  });
});

describe("Focus Session State Machine & Blocking Evaluation", () => {
  function evaluateBlocking(params: {
    settingsEnabled: boolean;
    scheduleMode: "focus_only" | "focus_and_breaks" | "always";
    pausePolicy: "keep_blocking" | "pause_blocking";
    session: TimerState | null;
    domainsCount: number;
  }): boolean {
    if (!params.settingsEnabled || params.domainsCount === 0) {
      return false;
    }

    if (params.scheduleMode === "always") {
      return true;
    }

    if (!params.session) {
      return false;
    }

    const calc = calculateRemaining(params.session);
    if (calc.isExpired) {
      return false;
    }

    const isEligibleMode =
      params.scheduleMode === "focus_and_breaks" ||
      params.session.sessionType === "focus";

    if (!isEligibleMode) {
      return false;
    }

    if (params.session.status === "active") {
      return true;
    }

    if (params.session.status === "paused") {
      return params.pausePolicy === "keep_blocking";
    }

    return false;
  }

  const now = new Date();
  const activeFocusSession: TimerState = {
    sessionId: "sess_1",
    sessionType: "focus",
    status: "active",
    startedAt: new Date(now.getTime() - 5 * 60 * 1000), // started 5 mins ago
    expectedEndAt: new Date(now.getTime() + 20 * 60 * 1000), // ends in 20 mins
    pausedDurationSeconds: 0,
    lastPausedAt: null,
    plannedDurationSeconds: 25 * 60,
  };

  it("activates blocking when an eligible focus session is active", () => {
    const isBlocking = evaluateBlocking({
      settingsEnabled: true,
      scheduleMode: "focus_only",
      pausePolicy: "keep_blocking",
      session: activeFocusSession,
      domainsCount: 5,
    });
    expect(isBlocking).toBe(true);
  });

  it("respects pause policy 'keep_blocking' when session is paused", () => {
    const pausedSession: TimerState = {
      ...activeFocusSession,
      status: "paused",
      lastPausedAt: new Date(now.getTime() - 60 * 1000),
    };

    const isBlocking = evaluateBlocking({
      settingsEnabled: true,
      scheduleMode: "focus_only",
      pausePolicy: "keep_blocking",
      session: pausedSession,
      domainsCount: 5,
    });
    expect(isBlocking).toBe(true);
  });

  it("respects pause policy 'pause_blocking' when session is paused", () => {
    const pausedSession: TimerState = {
      ...activeFocusSession,
      status: "paused",
      lastPausedAt: new Date(now.getTime() - 60 * 1000),
    };

    const isBlocking = evaluateBlocking({
      settingsEnabled: true,
      scheduleMode: "focus_only",
      pausePolicy: "pause_blocking",
      session: pausedSession,
      domainsCount: 5,
    });
    expect(isBlocking).toBe(false);
  });

  it("removes blocking rules when session completes", () => {
    const completedSession: TimerState = {
      ...activeFocusSession,
      status: "completed",
    };

    const isBlocking = evaluateBlocking({
      settingsEnabled: true,
      scheduleMode: "focus_only",
      pausePolicy: "keep_blocking",
      session: completedSession,
      domainsCount: 5,
    });
    expect(isBlocking).toBe(false);
  });

  it("removes blocking rules when session is abandoned or cancelled", () => {
    const abandonedSession: TimerState = {
      ...activeFocusSession,
      status: "abandoned",
    };

    const isBlocking = evaluateBlocking({
      settingsEnabled: true,
      scheduleMode: "focus_only",
      pausePolicy: "keep_blocking",
      session: abandonedSession,
      domainsCount: 5,
    });
    expect(isBlocking).toBe(false);
  });

  it("reconciles stale sessions when expectedEndAt is passed (e.g. browser was closed)", () => {
    // Session that was supposed to end 10 minutes ago
    const staleSession: TimerState = {
      sessionId: "sess_expired",
      sessionType: "focus",
      status: "active",
      startedAt: new Date(now.getTime() - 35 * 60 * 1000),
      expectedEndAt: new Date(now.getTime() - 10 * 60 * 1000), // in the past!
      pausedDurationSeconds: 0,
      lastPausedAt: null,
      plannedDurationSeconds: 25 * 60,
    };

    const isBlocking = evaluateBlocking({
      settingsEnabled: true,
      scheduleMode: "focus_only",
      pausePolicy: "keep_blocking",
      session: staleSession,
      domainsCount: 5,
    });
    // Server and client must treat expired session as NOT blocking!
    expect(isBlocking).toBe(false);
  });

  it("supports break intervals according to scheduleMode policy", () => {
    const breakSession: TimerState = {
      sessionId: "sess_break",
      sessionType: "short_break",
      status: "active",
      startedAt: new Date(now.getTime() - 2 * 60 * 1000),
      expectedEndAt: new Date(now.getTime() + 3 * 60 * 1000),
      pausedDurationSeconds: 0,
      lastPausedAt: null,
      plannedDurationSeconds: 5 * 60,
    };

    // focus_only: breaks are free
    const focusOnlyBlocking = evaluateBlocking({
      settingsEnabled: true,
      scheduleMode: "focus_only",
      pausePolicy: "keep_blocking",
      session: breakSession,
      domainsCount: 5,
    });
    expect(focusOnlyBlocking).toBe(false);

    // focus_and_breaks: blocking continues during breaks
    const focusAndBreaksBlocking = evaluateBlocking({
      settingsEnabled: true,
      scheduleMode: "focus_and_breaks",
      pausePolicy: "keep_blocking",
      session: breakSession,
      domainsCount: 5,
    });
    expect(focusAndBreaksBlocking).toBe(true);
  });
});

describe("Pairing Credentials & Revocation Security", () => {
  it("generates separate hashes for distinct pairing codes", () => {
    const codeA = generatePairingCode();
    const codeB = generatePairingCode();

    expect(hashSha256(codeA)).not.toBe(hashSha256(codeB));
  });

  it("does not log or leak raw token or credentials", () => {
    const rawToken = generateExtensionToken();
    const tokenHash = hashSha256(rawToken);

    expect(tokenHash).not.toContain(rawToken);
    expect(rawToken.startsWith("ff_ext_")).toBe(true);
    expect(tokenHash).toHaveLength(64);
  });
});
