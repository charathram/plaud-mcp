import { resolveEnvPath } from "./env.js";

const BASE_URL = "https://api.plaud.ai";

interface EnvConfig {
  authToken: string;
  deviceTag: string;
  userHash: string;
  deviceId: string;
}

let cachedConfig: EnvConfig | null = null;

export function _resetConfigCache() {
  cachedConfig = null;
}

async function loadEnv(): Promise<EnvConfig> {
  if (cachedConfig) return cachedConfig;

  const envPath = resolveEnvPath();
  const text = await Bun.file(envPath).text();
  const vars: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }

  cachedConfig = {
    authToken: vars.PLAUD_AUTH_TOKEN ?? "",
    deviceTag: vars.PLAUD_DEVICE_TAG ?? "",
    userHash: vars.PLAUD_USER_HASH ?? "",
    deviceId: vars.PLAUD_DEVICE_ID ?? "",
  };

  if (!cachedConfig.authToken) {
    throw new Error("PLAUD_AUTH_TOKEN is missing from .env file");
  }

  return cachedConfig;
}

export async function plaudRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const config = await loadEnv();

  const headers: Record<string, string> = {
    Authorization: `bearer ${config.authToken}`,
    "edit-from": "web",
    "app-platform": "web",
    "app-language": "en",
    timezone: "America/Los_Angeles",
    "x-pld-tag": config.deviceTag,
    "x-pld-user": config.userHash,
    "x-device-id": config.deviceId,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    throw new Error(
      "Plaud API returned 401 — token expired. Re-extract JWT from browser at web.plaud.ai."
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Plaud API ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}
