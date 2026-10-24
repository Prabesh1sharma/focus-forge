/**
 * DeclarativeNetRequest rule representation for Chrome Extension Manifest V3.
 */
export interface DnrRule {
  id: number;
  priority: number;
  action: {
    type: "redirect" | "block";
    redirect?: {
      extensionPath?: string;
      url?: string;
    };
  };
  condition: {
    urlFilter: string;
    resourceTypes: Array<
      | "main_frame"
      | "sub_frame"
      | "stylesheet"
      | "script"
      | "image"
      | "font"
      | "object"
      | "xmlhttprequest"
      | "ping"
      | "csp_report"
      | "media"
      | "websocket"
      | "other"
    >;
  };
}

/**
 * Builds declarativeNetRequest rule urlFilter for a given normalized domain.
 * 
 * In Chrome declarativeNetRequest:
 * - '||' prefix matches the beginning of a domain name (e.g. ||example.com matches example.com and sub.example.com)
 * - '^' matches a separator character (e.g. '/', ':', '?', or end of URL), preventing accidental matches like example.com.attacker.com
 */
export function buildDomainUrlFilter(domain: string): string {
  const cleanDomain = domain.toLowerCase().trim();
  return `||${cleanDomain}^`;
}

/**
 * Generates deterministic declarativeNetRequest dynamic rules for a list of domains.
 * Rule IDs are deterministic integers starting at 1.
 */
export function generateDnrRules(
  domains: string[],
  options: {
    actionType?: "redirect" | "block";
    extensionPath?: string;
    priority?: number;
    startId?: number;
  } = {}
): DnrRule[] {
  const actionType = options.actionType || "redirect";
  const extensionPath = options.extensionPath || "/blocked.html";
  const priority = options.priority || 1;
  const startId = options.startId || 1;

  // Deduplicate and filter empty domains
  const uniqueDomains = Array.from(
    new Set(
      domains
        .map((d) => d.toLowerCase().trim())
        .filter((d) => Boolean(d))
    )
  ).sort();

  return uniqueDomains.map((domain, index) => {
    const rule: DnrRule = {
      id: startId + index,
      priority,
      action:
        actionType === "redirect"
          ? {
              type: "redirect",
              redirect: {
                extensionPath,
              },
            }
          : {
              type: "block",
            },
      condition: {
        urlFilter: buildDomainUrlFilter(domain),
        resourceTypes: ["main_frame"],
      },
    };
    return rule;
  });
}

/**
 * Evaluates whether a given URL matches a declarativeNetRequest domain rule.
 * Useful for unit testing declarativeNetRequest semantics without launching Chrome.
 */
export function matchesDomainFilter(ruleDomain: string, testUrlString: string): boolean {
  try {
    const parsed = new URL(testUrlString);
    const hostname = parsed.hostname.toLowerCase();
    const targetDomain = ruleDomain.toLowerCase();

    // Exact match: hostname === targetDomain (e.g. reddit.com === reddit.com)
    if (hostname === targetDomain) {
      return true;
    }

    // Subdomain match: hostname ends with .targetDomain (e.g. old.reddit.com ends with .reddit.com)
    if (hostname.endsWith("." + targetDomain)) {
      return true;
    }

    // Unrelated domains (e.g. notreddit.com, reddit.com.attacker.org) must NOT match
    return false;
  } catch {
    return false;
  }
}
