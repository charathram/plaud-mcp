import { resolveEnvPath } from "./env.js";
import { logger } from "./logger.js";
import { readCachedCredentials, type PlaudCredentials } from "./credentials.js";
import type { z } from "zod";

const BASE_URL = "https://api.plaud.ai";

const NO_CREDS_MESSAGE =
  "No Plaud credentials found. Use the plaud_login tool to sign in (opens a browser window).";
const EXPIRED_MESSAGE =
  "Plaud token expired. Use the plaud_login tool to sign in again (opens a browser window).";

let cachedConfig: PlaudCredentials | null = null;

export function _resetConfigCache() {
  cachedConfig = null;
}

async function loadEnv(): Promise<PlaudCredentials> {
  if (cachedConfig) return cachedConfig;

  // Cache file takes precedence over env vars: plaud_login writes to the
  // cache, and that's the latest user intent. If we checked env vars first,
  // stale MCPB user_config values would override fresh credentials.
  const cached = await readCachedCredentials();
  if (cached) {
    cachedConfig = cached;
    logger.debug("Loaded credentials from cache file");
    return cachedConfig;
  }

  if (process.env.PLAUD_AUTH_TOKEN) {
    cachedConfig = {
      authToken: process.env.PLAUD_AUTH_TOKEN,
      deviceTag: process.env.PLAUD_DEVICE_TAG ?? "",
      userHash: process.env.PLAUD_USER_HASH ?? "",
      deviceId: process.env.PLAUD_DEVICE_ID ?? "",
    };
    logger.debug("Loaded credentials from environment");
    return cachedConfig;
  }

  const envPath = resolveEnvPath();
  const envFile = Bun.file(envPath);
  if (!(await envFile.exists())) {
    throw new Error(NO_CREDS_MESSAGE);
  }

  const text = await envFile.text();
  const vars: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }

  if (!vars.PLAUD_AUTH_TOKEN) {
    throw new Error(NO_CREDS_MESSAGE);
  }

  cachedConfig = {
    authToken: vars.PLAUD_AUTH_TOKEN,
    deviceTag: vars.PLAUD_DEVICE_TAG ?? "",
    userHash: vars.PLAUD_USER_HASH ?? "",
    deviceId: vars.PLAUD_DEVICE_ID ?? "",
  };

  logger.debug("Loaded credentials from .env file", { envPath });
  return cachedConfig;
}

export async function plaudRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  schema?: z.ZodType<T>,
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

  logger.info(`${method} ${path}`, body !== undefined ? { body: JSON.stringify(body) } : undefined);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    logger.error("Auth token expired", { path });
    _resetConfigCache();
    throw new Error(EXPIRED_MESSAGE);
  }

  if (!res.ok) {
    const text = await res.text();
    logger.error(`API request failed`, { method, path, status: res.status, response: text });
    throw new Error(`Plaud API ${method} ${path} failed (${res.status}): ${text}`);
  }

  logger.debug(`${method} ${path} responded`, { status: res.status });

  const json = await res.json();
  if (schema) {
    try {
      return schema.parse(json);
    } catch (err) {
      logger.error("Response validation failed — API schema mismatch", {
        method,
        path,
        error: String(err),
      });
      throw err;
    }
  }
  return json as T;
}
