/**
 * Chat profanity filter — replaces matched words with "***".
 * Word-boundary aware, case-insensitive, handles common letter substitutions.
 */

const WORD_LIST = [
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "cock",
  "crap",
  "cunt",
  "damn",
  "dick",
  "douche",
  "fag",
  "faggot",
  "fuck",
  "goddamn",
  "hell",
  "jackass",
  "motherfucker",
  "nigga",
  "nigger",
  "piss",
  "prick",
  "pussy",
  "retard",
  "shit",
  "slut",
  "twat",
  "whore",
  "wanker",
];

/** Map of common letter substitutions → their canonical letter */
const SUBSTITUTIONS: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "5": "s",
  "$": "s",
  "7": "t",
  "+": "t",
};

/**
 * Build a regex pattern for a word that matches common letter substitutions.
 * E.g. "fuck" → "f[uv]c[ck]" style patterns with substitution awareness.
 */
function buildPattern(word: string): string {
  return word
    .split("")
    .map((ch) => {
      // Find all substitution chars that map to this letter
      const alts = Object.entries(SUBSTITUTIONS)
        .filter(([, v]) => v === ch)
        .map(([k]) => escapeRegex(k));
      if (alts.length > 0) {
        return `[${escapeRegex(ch)}${alts.join("")}]`;
      }
      return escapeRegex(ch);
    })
    .join("");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pre-compiled regex matching all profane words with substitution variants */
const FILTER_REGEX = new RegExp(
  "\\b(" + WORD_LIST.map(buildPattern).join("|") + ")\\b",
  "gi",
);

/**
 * Replace profane words in `text` with "***".
 * Returns the filtered string.
 */
export function filterText(text: string): string {
  return text.replace(FILTER_REGEX, "***");
}

// ── Secret filter ────────────────────────────────────────────────

/**
 * Patterns that match common secret formats.
 * Each match is replaced with "[REDACTED]".
 */
const SECRET_PATTERNS: RegExp[] = [
  // Ethereum private keys (64 hex chars, optionally 0x-prefixed)
  /\b0x[0-9a-fA-F]{64}\b/g,
  // Generic hex keys 32+ bytes (64+ hex chars without 0x)
  /\b[0-9a-fA-F]{64,}\b/g,
  // AWS-style keys (AKIA...)
  /\bAKIA[0-9A-Z]{16}\b/g,
  // Bearer tokens
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  // API key patterns: sk-..., sk_..., key-..., key_..., api-..., api_...
  /\b(?:sk|api|key|token|secret|password|passwd|auth)[-_][A-Za-z0-9\-._~+/]{16,}\b/gi,
  // JWT tokens (3 base64 segments separated by dots)
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  // Nostr private keys (nsec1...)
  /\bnsec1[a-z0-9]{58}\b/g,
  // GitHub tokens (ghp_, gho_, ghs_, ghr_)
  /\b(?:ghp|gho|ghs|ghr)_[A-Za-z0-9]{36,}\b/g,
  // Generic "password=..." or "secret=..." in text
  /(?:password|secret|token|apikey|api_key)[\s]*[=:]\s*\S{8,}/gi,
];

/**
 * Redact anything that looks like a secret from chat text.
 * Always active regardless of profanity filter setting.
 */
export function filterSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}
