import { describe, it, expect } from "vitest";
import {
  generateDnrRules,
  buildDomainUrlFilter,
  matchesDomainFilter,
} from "@/lib/extension/rules";

describe("DeclarativeNetRequest Rules Generation", () => {
  it("builds correct declarativeNetRequest urlFilter format", () => {
    expect(buildDomainUrlFilter("reddit.com")).toBe("||reddit.com^");
    expect(buildDomainUrlFilter("youtube.com")).toBe("||youtube.com^");
  });

  it("generates deterministic sequential rule IDs", () => {
    const domains = ["twitter.com", "reddit.com", "youtube.com"];
    const rules = generateDnrRules(domains);

    expect(rules).toHaveLength(3);
    expect(rules[0].id).toBe(1);
    expect(rules[1].id).toBe(2);
    expect(rules[2].id).toBe(3);

    // Rule action should be redirect to extensionPath
    expect(rules[0].action.type).toBe("redirect");
    expect(rules[0].action.redirect?.extensionPath).toBe("/blocked.html");

    // Only top-level navigation (main_frame) is targeted
    expect(rules[0].condition.resourceTypes).toEqual(["main_frame"]);
  });

  it("deduplicates domains and sorts them predictably", () => {
    const duplicates = ["reddit.com", "REDDIT.COM", "  reddit.com  ", "x.com"];
    const rules = generateDnrRules(duplicates);

    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.condition.urlFilter)).toEqual(["||reddit.com^", "||x.com^"]);
  });

  it("correctly matches root domain and any subdomains", () => {
    const domain = "reddit.com";

    // Exact matches
    expect(matchesDomainFilter(domain, "https://reddit.com/")).toBe(true);
    expect(matchesDomainFilter(domain, "http://reddit.com/r/reactjs")).toBe(true);
    expect(matchesDomainFilter(domain, "https://reddit.com:443/")).toBe(true);

    // Subdomains
    expect(matchesDomainFilter(domain, "https://old.reddit.com/")).toBe(true);
    expect(matchesDomainFilter(domain, "https://np.reddit.com/")).toBe(true);
    expect(matchesDomainFilter(domain, "https://alpha.beta.reddit.com/sub/path")).toBe(true);
  });

  it("prevents unrelated-domain matches", () => {
    const domain = "reddit.com";

    // Unrelated domains containing reddit.com
    expect(matchesDomainFilter(domain, "https://notreddit.com/")).toBe(false);
    expect(matchesDomainFilter(domain, "https://fakereddit.com/")).toBe(false);
    expect(matchesDomainFilter(domain, "https://reddit.com.attacker.com/")).toBe(false);
    expect(matchesDomainFilter(domain, "https://reddit.community/")).toBe(false);

    // Completely unrelated
    expect(matchesDomainFilter(domain, "https://github.com/")).toBe(false);
  });
});
