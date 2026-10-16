type LogLevel = "debug" | "info" | "warn" | "error";

const activeLevel: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
const levelScore: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "phone",
]);

function redact(key: string, value: unknown): unknown {
  if (REDACT_KEYS.has(key.toLowerCase())) {
    return "[REDACTED]";
  }
  return value;
}

function serialize(parts: unknown[]): string {
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (part instanceof Error) return part.stack ?? part.message;
      try {
        return JSON.stringify(part, (key, value) => redact(key, value));
      } catch {
        return String(part);
      }
    })
    .join(" ");
}

function write(level: LogLevel, parts: unknown[]): void {
  if (levelScore[level] < levelScore[activeLevel]) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${serialize(parts)}`;
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (...parts: unknown[]) => write("debug", parts),
  info: (...parts: unknown[]) => write("info", parts),
  warn: (...parts: unknown[]) => write("warn", parts),
  error: (...parts: unknown[]) => write("error", parts),
};