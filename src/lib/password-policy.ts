/**
 * Password policy shared by the browser (strength meter) and the server
 * (Zod validation). There are intentionally NO arbitrary composition rules
 * (no forced symbols/upper/lower) — we enforce length and reject known-bad
 * passwords, then encourage passphrases via the strength meter.
 */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * A small, curated set of the most commonly breached passwords (and their
 * obvious mutations). This is intentionally short — it catches the worst
 * offenders without pretending to be a full breach corpus.
 */
const COMMON_PASSWORDS = new Set(
  [
    "123456",
    "123456789",
    "12345678",
    "1234567890",
    "1234567",
    "111111",
    "000000",
    "666666",
    "888888",
    "123123",
    "112233",
    "121212",
    "654321",
    "qwerty",
    "qwertyuiop",
    "qwerty123",
    "qwerty1",
    "1q2w3e4r",
    "1qaz2wsx",
    "zaq12wsx",
    "asdfghjkl",
    "asdfgh",
    "zxcvbnm",
    "qazwsx",
    "abc123",
    "abcd1234",
    "a1b2c3d4",
    "password",
    "password1",
    "password12",
    "password123",
    "password1234",
    "password1!",
    "passw0rd",
    "p@ssw0rd",
    "p@ssword",
    "passwords",
    "pass",
    "letmein",
    "welcome",
    "welcome1",
    "welcome123",
    "admin",
    "admin123",
    "administrator",
    "root",
    "toor",
    "guest",
    "changeme",
    "secret",
    "secret123",
    "iloveyou",
    "sunshine",
    "princess",
    "monkey",
    "dragon",
    "master",
    "shadow",
    "michael",
    "superman",
    "batman",
    "football",
    "baseball",
    "basketball",
    "soccer",
    "jordan",
    "harley",
    "ranger",
    "hunter",
    "trustno1",
    "mustang",
    "ninja",
    "starwars",
    "whatever",
    "freedom",
    "hello",
    "hello123",
    "hello1234",
    "test",
    "test123",
    "testing",
    "testing123",
    "abcd123456",
    "qwerty12345",
    "1234qwer",
    "zaq1xsw2",
    "1qazxsw2",
    "password12345",
    "welcome1234",
    "letmein123",
    "changeme123",
    "iloveyou123",
    "pakistan",
    "pakistan1",
    "pakistan123",
    "lahore",
    "karachi",
    "islamabad",
    "islamabad1",
    "bachelorstreet",
    "bachelorstreet123",
  ].filter(Boolean),
);

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
  "+": "t",
};

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "01234567890",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

function stripSymbols(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function deLeet(value: string): string {
  return value
    .toLowerCase()
    .replace(/[0134578@$!+]/g, (ch) => LEET_MAP[ch] ?? ch)
    .replace(/[^a-z0-9]/g, "");
}

function hasSequentialRun(value: string, minRun = 6): boolean {
  for (const seq of SEQUENCES) {
    const reversed = [...seq].reverse().join("");
    for (const source of [seq, reversed]) {
      for (let i = 0; i + minRun <= source.length; i += 1) {
        if (value.includes(source.slice(i, i + minRun))) return true;
      }
    }
  }
  return false;
}

/** True when the password (or an obvious mutation) is a well-known bad one. */
export function isCommonPassword(password: string): boolean {
  const candidates = new Set([stripSymbols(password), deLeet(password)]);
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (COMMON_PASSWORDS.has(candidate)) return true;
    const withoutTrailingDigits = candidate.replace(/[0-9]+$/, "");
    if (withoutTrailingDigits.length >= 5 && COMMON_PASSWORDS.has(withoutTrailingDigits)) {
      return true;
    }
    // Repeated single character, e.g. "aaaaaaaaaaaa".
    if (/^(.)\1+$/.test(candidate)) return true;
    if (hasSequentialRun(candidate)) return true;
  }
  return false;
}

export type PasswordContext = {
  email?: string;
  name?: string;
};

/** Returns human-readable problems, newest-policy-first. Empty = acceptable. */
export function passwordIssues(
  password: string,
  context: PasswordContext = {},
): string[] {
  const issues: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    issues.push(`Use at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
  if (password.length >= PASSWORD_MIN_LENGTH && isCommonPassword(password)) {
    issues.push("This password is too common — choose something less guessable.");
  }

  const passwordLower = password.toLowerCase();
  const localPart = context.email?.split("@")[0]?.toLowerCase();
  if (localPart && localPart.length >= 4 && passwordLower.includes(localPart)) {
    issues.push("Avoid using your email address in your password.");
  }
  const name = context.name?.trim().toLowerCase();
  if (name && name.length >= 4 && passwordLower.includes(name)) {
    issues.push("Avoid using your name in your password.");
  }
  return issues;
}

export type PasswordStrength = {
  /** 0 (very weak) → 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
};

function charsetSize(password: string): number {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 33;
  return size || 1;
}

/**
 * Lightweight, dependency-free strength estimate (entropy + penalties).
 * A long passphrase scores higher than a short complex string, as intended.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "Very weak" };

  const entropy = password.length * Math.log2(charsetSize(password));
  const uniqueChars = new Set(password).size;
  let penalty = 0;
  if (isCommonPassword(password)) penalty += 60;
  if (/^(.)\1+$/.test(password)) penalty += 40;
  if (uniqueChars <= Math.max(3, password.length / 3)) penalty += 15;
  if (/^\d+$/.test(password)) penalty += 20;

  const adjusted = entropy - penalty;

  if (adjusted < 28) return { score: 0, label: "Very weak" };
  if (adjusted < 40) return { score: 1, label: "Weak" };
  if (adjusted < 60) return { score: 2, label: "Fair" };
  if (adjusted < 80) return { score: 3, label: "Strong" };
  return { score: 4, label: "Very strong" };
}
