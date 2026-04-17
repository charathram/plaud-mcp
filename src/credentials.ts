import { homedir } from "os";
import { join, dirname } from "path";
import { mkdir, chmod } from "fs/promises";
import { logger } from "./logger.js";

export interface PlaudCredentials {
  authToken: string;
  deviceTag: string;
  userHash: string;
  deviceId: string;
}

const DEFAULT_PATH = join(homedir(), ".plaud-mcp", "credentials.json");

function resolveCachePath(): string {
  return process.env.PLAUD_CREDENTIALS_FILE
    ? process.env.PLAUD_CREDENTIALS_FILE
    : DEFAULT_PATH;
}

export async function readCachedCredentials(): Promise<PlaudCredentials | null> {
  const path = resolveCachePath();
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    const data = await file.json();
    if (typeof data?.authToken !== "string" || !data.authToken) return null;
    return {
      authToken: data.authToken,
      deviceTag: data.deviceTag ?? "",
      userHash: data.userHash ?? "",
      deviceId: data.deviceId ?? "",
    };
  } catch (err) {
    logger.warn("Credentials cache unreadable — ignoring", { path, error: String(err) });
    return null;
  }
}

export async function writeCachedCredentials(creds: PlaudCredentials): Promise<string> {
  const path = resolveCachePath();
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, JSON.stringify(creds, null, 2));
  // Tighten perms on POSIX; silently skip on Windows where chmod is a no-op.
  if (process.platform !== "win32") {
    await chmod(path, 0o600);
  }
  return path;
}
