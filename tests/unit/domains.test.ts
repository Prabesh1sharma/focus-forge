import { describe, it, expect } from "vitest";
import { normalizeDomain, PRESET_CATEGORIES } from "@/lib/validations/domains";

describe("Domain Normalization & Validation", () => {
  it("normalizes clean domain strings", () => {
    const res = normalizeDomain("reddit.com");
    expect(res.success).toBe(true);
    expect(res.domain).toBe("reddit.com");
  });

  it("lowercases domains", () => {
    const res = normalizeDomain("YouTube.COM");
    expect(res.success).toBe(true);
    expect(res.domain).toBe("youtube.com");
  });

  it("strips http and https protocols", () => {
    const res1 = normalizeDomain("https://twitter.com");
    expect(res1.success).toBe(true);
    expect(res1.domain).toBe("twitter.com");

    const res2 = normalizeDomain("http://facebook.com");
    expect(res2.success).toBe(true);
    expect(res2.domain).toBe("facebook.com");
  });

  it("strips paths, query parameters, anchors, and ports", () => {
    const res = normalizeDomain("https://news.ycombinator.com:8080/item?id=12345#comments");
    expect(res.success).toBe(true);
    expect(res.domain).toBe("news.ycombinator.com");
  });

  it("strips leading www.", () => {
    const res1 = normalizeDomain("www.instagram.com");
    expect(res1.success).toBe(true);
    expect(res1.domain).toBe("instagram.com");

    const res2 = normalizeDomain("https://www.tiktok.com/@user");
    expect(res2.success).toBe(true);
    expect(res2.domain).toBe("tiktok.com");
  });

  it("retains subdomains other than www", () => {
    const res = normalizeDomain("music.youtube.com");
    expect(res.success).toBe(true);
    expect(res.domain).toBe("music.youtube.com");
  });

  it("rejects browser-internal schemes", () => {
    const chromeRes = normalizeDomain("chrome://settings");
    expect(chromeRes.success).toBe(false);
    expect(chromeRes.error).toContain("Browser-internal");

    const extRes = normalizeDomain("chrome-extension://abcdefghijklmnop");
    expect(extRes.success).toBe(false);

    const aboutRes = normalizeDomain("about:blank");
    expect(aboutRes.success).toBe(false);

    const fileRes = normalizeDomain("file:///etc/passwd");
    expect(fileRes.success).toBe(false);
  });

  it("rejects IPv4 and IPv6 addresses", () => {
    const ipv4 = normalizeDomain("192.168.1.1");
    expect(ipv4.success).toBe(false);
    expect(ipv4.error).toContain("IP addresses are not supported");

    const localhostIp = normalizeDomain("127.0.0.1");
    expect(localhostIp.success).toBe(false);

    const ipv6 = normalizeDomain("[::1]");
    expect(ipv6.success).toBe(false);
  });

  it("rejects single-label domains or broad wildcards", () => {
    const singleLabel = normalizeDomain("localhost");
    expect(singleLabel.success).toBe(false);
    expect(singleLabel.error).toContain("top-level domain");

    const wildcard = normalizeDomain("*.google.com");
    expect(wildcard.success).toBe(false);
    expect(wildcard.error).toContain("Wildcard");

    const tld = normalizeDomain("com");
    expect(tld.success).toBe(false);

    const restrictedTld = normalizeDomain("co.uk");
    expect(restrictedTld.success).toBe(false);
    expect(restrictedTld.error).toContain("suffix is not permitted");
  });

  it("rejects invalid characters in domain labels", () => {
    const invalidChar = normalizeDomain("foo_bar.com");
    expect(invalidChar.success).toBe(false);

    const spaces = normalizeDomain("foo bar.com");
    expect(spaces.success).toBe(false);

    const hyphenStart = normalizeDomain("-badlabel.com");
    expect(hyphenStart.success).toBe(false);
  });

  it("verifies preset categories exist and contain valid domains", () => {
    expect(PRESET_CATEGORIES.social_media.domains.length).toBeGreaterThan(0);
    expect(PRESET_CATEGORIES.entertainment.domains.length).toBeGreaterThan(0);
    expect(PRESET_CATEGORIES.news.domains.length).toBeGreaterThan(0);

    for (const cat of Object.values(PRESET_CATEGORIES)) {
      for (const d of cat.domains) {
        const check = normalizeDomain(d);
        expect(check.success).toBe(true);
        expect(check.domain).toBe(d);
      }
    }
  });
});
