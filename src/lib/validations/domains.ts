export interface NormalizeDomainResult {
  success: boolean;
  domain?: string;
  error?: string;
}

// Common TLDs and public suffixes that must NOT be blocked on their own
// to prevent broad unintended outages
const RESTRICTED_SUFFIXES = new Set([
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "mil",
  "io",
  "co",
  "ai",
  "app",
  "dev",
  "co.uk",
  "org.uk",
  "com.au",
  "co.nz",
  "co.jp",
  "com.br",
]);

// IPv4 regex (quad decimal)
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

// IPv6 regex check
const IPV6_REGEX = /^\[?[0-9a-fA-F:]+\]?$/;

// Valid hostname label: alphanumeric or hyphen, not starting or ending with hyphen
const LABEL_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * Normalizes and validates a domain name.
 * 
 * Rejects:
 * - Malformed domains
 * - Browser-internal URLs (chrome://, about:, etc.)
 * - Unsupported schemes
 * - IP addresses
 * - Inappropriate / wildcard entries
 * - Broad TLDs / root suffixes
 */
export function normalizeDomain(rawInput: string): NormalizeDomainResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { success: false, error: "Domain cannot be empty." };
  }

  let input = rawInput.trim();

  // Check for browser-internal or disallowed schemes
  const lowerInput = input.toLowerCase();
  if (
    lowerInput.startsWith("chrome://") ||
    lowerInput.startsWith("chrome-extension://") ||
    lowerInput.startsWith("about:") ||
    lowerInput.startsWith("file://") ||
    lowerInput.startsWith("edge://") ||
    lowerInput.startsWith("brave://") ||
    lowerInput.startsWith("opera://") ||
    lowerInput.startsWith("javascript:") ||
    lowerInput.startsWith("data:")
  ) {
    return {
      success: false,
      error: "Browser-internal and script URLs cannot be blocked.",
    };
  }

  // Remove scheme if present (http, https, ftp, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input)) {
    try {
      const url = new URL(input);
      input = url.hostname;
    } catch {
      input = input.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
    }
  }

  // Strip path, query parameters, hashes, port numbers
  // e.g. "reddit.com/r/programming?sort=top#header" -> "reddit.com"
  input = input.split("/")[0];
  input = input.split("?")[0];
  input = input.split("#")[0];
  input = input.split(":")[0]; // strip port

  input = input.trim().toLowerCase();

  // Remove trailing dots if any (e.g. "reddit.com.")
  while (input.endsWith(".")) {
    input = input.slice(0, -1);
  }

  // Strip leading www. and sub-www
  while (input.startsWith("www.")) {
    input = input.slice(4);
  }

  if (!input) {
    return { success: false, error: "Please enter a valid domain name." };
  }

  // Total domain length check (RFC 1035 max 253 octets)
  if (input.length > 253) {
    return { success: false, error: "Domain name is too long (maximum 253 characters)." };
  }

  // Disallow wildcards
  if (input.includes("*") || input.includes("%")) {
    return {
      success: false,
      error: "Wildcard patterns are not allowed. Subdomains are automatically covered.",
    };
  }

  // Reject IP addresses
  if (IPV4_REGEX.test(input)) {
    return {
      success: false,
      error: "IP addresses are not supported. Please use domain names.",
    };
  }

  if (IPV6_REGEX.test(input) || input.includes(":")) {
    return {
      success: false,
      error: "IPv6 addresses are not supported. Please use domain names.",
    };
  }

  // Domain must contain at least one dot separating labels
  const parts = input.split(".");
  if (parts.length < 2) {
    return {
      success: false,
      error: "Domain must include a top-level domain (e.g., example.com).",
    };
  }

  // Disallow broad TLD / suffix blocking
  if (RESTRICTED_SUFFIXES.has(input)) {
    return {
      success: false,
      error: `Blocking entire '${input}' suffix is not permitted as it would block all websites on that TLD.`,
    };
  }

  // Validate each label
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) {
      return { success: false, error: "Domain contains consecutive or invalid dots." };
    }
    if (part.length > 63) {
      return {
        success: false,
        error: `Domain label '${part}' exceeds maximum length of 63 characters.`,
      };
    }
    if (!LABEL_REGEX.test(part)) {
      return {
        success: false,
        error: `Domain label '${part}' contains invalid characters. Only alphanumeric characters and hyphens are allowed.`,
      };
    }
  }

  // Validate TLD (last part): must be alphabetic and at least 2 characters
  const tld = parts[parts.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) {
    return {
      success: false,
      error: `Top-level domain '.${tld}' is invalid.`,
    };
  }

  return { success: true, domain: input };
}

// ─── Preset Categories ────────────────────────────────────────────────────────

export interface PresetCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  domains: string[];
}

export const PRESET_CATEGORIES: Record<string, PresetCategory> = {
  social_media: {
    id: "social_media",
    name: "Social Media",
    description: "Keep feed scrolling and instant notifications from interrupting focus",
    iconName: "Share2",
    domains: [
      "x.com",
      "twitter.com",
      "instagram.com",
      "facebook.com",
      "reddit.com",
      "tiktok.com",
      "linkedin.com",
      "threads.net",
      "pinterest.com",
    ],
  },
  entertainment: {
    id: "entertainment",
    name: "Entertainment",
    description: "Prevent video bingeing, game streaming, and audio-visual distractions",
    iconName: "Tv",
    domains: [
      "youtube.com",
      "netflix.com",
      "twitch.tv",
      "hulu.com",
      "disneyplus.com",
      "primevideo.com",
      "spotify.com",
    ],
  },
  news: {
    id: "news",
    name: "News & Media",
    description: "Avoid falling into doomscrolling and breaking news rabbit holes",
    iconName: "Newspaper",
    domains: [
      "cnn.com",
      "bbc.com",
      "nytimes.com",
      "theguardian.com",
      "foxnews.com",
      "reuters.com",
      "washingtonpost.com",
      "bloomberg.com",
    ],
  },
};
