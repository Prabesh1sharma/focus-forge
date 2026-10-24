/**
 * DeclarativeNetRequest Dynamic Rules Manager for Chrome Extension Manifest V3.
 */

export function buildUrlFilter(domain: string): string {
  // '||' matches the beginning of the domain name (including subdomains)
  // '^' matches a separator character, preventing matches with longer unrelated domains
  return `||${domain.toLowerCase().trim()}^`;
}

/**
 * Replaces existing dynamic rules with updated blocking rules.
 * If isBlockingActive is false or domain list is empty, all dynamic rules are safely removed.
 * Returns the count of active rules installed.
 */
export async function updateDynamicBlockingRules(
  domains: string[],
  isBlockingActive: boolean
): Promise<number> {
  if (typeof chrome === "undefined" || !chrome.declarativeNetRequest) {
    console.warn("chrome.declarativeNetRequest is not available in current environment");
    return 0;
  }

  // 1. Fetch current dynamic rules to safely obtain existing IDs
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((rule) => rule.id);

  // 2. If blocking is not active or list is empty, clean up and exit
  if (!isBlockingActive || !domains || domains.length === 0) {
    if (removeRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: [],
      });
    }
    return 0;
  }

  // 3. Normalize & deduplicate domains
  const uniqueDomains = Array.from(
    new Set(
      domains
        .map((d) => d.toLowerCase().trim())
        .filter((d) => Boolean(d))
    )
  ).sort();

  // 4. Generate sequential deterministic rules
  const addRules: chrome.declarativeNetRequest.Rule[] = uniqueDomains.map(
    (domain, index) => ({
      id: index + 1, // Deterministic sequential IDs (1, 2, 3...)
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          extensionPath: "/blocked.html",
        },
      },
      condition: {
        urlFilter: buildUrlFilter(domain),
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        ],
      },
    })
  );

  // 5. Atomic replacement: remove obsolete rules and add current rules in single call
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });

  return addRules.length;
}

/**
 * Removes all active dynamic rules.
 */
export async function clearAllDynamicRules(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.declarativeNetRequest) {
    return;
  }
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((rule) => rule.id);
  if (removeRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [],
    });
  }
}
