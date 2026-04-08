const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type LogLevel = keyof typeof LEVELS;

const COLORS = {
  DEBUG: "\x1b[36m",  // cyan
  INFO: "\x1b[32m",   // green
  WARN: "\x1b[33m",   // yellow
  ERROR: "\x1b[31m",  // red
} as const;

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

let currentLevel: number = LEVELS.INFO;

export function setLogLevel(level: LogLevel) {
  currentLevel = LEVELS[level];
}

export function getLogLevel(): LogLevel {
  return (Object.entries(LEVELS) as [LogLevel, number][])
    .find(([, v]) => v === currentLevel)![0];
}

export function parseLogLevel(): LogLevel {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--log-level");
  if (idx !== -1 && args[idx + 1]) {
    const val = args[idx + 1].toUpperCase();
    if (val in LEVELS) return val as LogLevel;
    console.error(`Invalid log level: ${args[idx + 1]}. Valid: debug, info, warn, error`);
    process.exit(1);
  }
  if (process.env.PLAUD_LOG_LEVEL) {
    const val = process.env.PLAUD_LOG_LEVEL.toUpperCase();
    if (val in LEVELS) return val as LogLevel;
  }
  return "INFO";
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (LEVELS[level] < currentLevel) return;

  const color = COLORS[level];
  const tag = `${color}${BOLD}${level.padEnd(5)}${RESET}`;
  const ts = `${DIM}${timestamp()}${RESET}`;
  const parts = [`${ts} ${tag} ${message}`];

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      const formatted = typeof value === "object" ? JSON.stringify(value) : String(value);
      parts.push(`  ${DIM}${key}=${RESET}${formatted}`);
    }
  }

  // MCP uses stdio, so log to stderr to avoid corrupting the protocol
  console.error(parts.join("\n"));
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("DEBUG", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("INFO", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("WARN", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("ERROR", msg, data),
};
