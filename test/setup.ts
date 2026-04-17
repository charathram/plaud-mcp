import { beforeEach, mock } from "bun:test";
import { _resetConfigCache } from "../src/client.js";
import { tmpdir } from "os";
import { join } from "path";

// Clear any ambient Plaud credentials so the .env-file path is exercised.
// Tests that want to assert the env-var precedence branch set these explicitly.
delete process.env.PLAUD_AUTH_TOKEN;
delete process.env.PLAUD_DEVICE_TAG;
delete process.env.PLAUD_USER_HASH;
delete process.env.PLAUD_DEVICE_ID;

// Point credentials cache at a per-run tmp path that doesn't exist by default,
// so tests don't pick up real credentials from ~/.plaud-mcp/credentials.json.
process.env.PLAUD_CREDENTIALS_FILE = join(tmpdir(), `plaud-mcp-test-creds-${process.pid}.json`);

// Write a test .env file and point PLAUD_ENV_FILE to it
const testEnvPath = join(tmpdir(), "plaud-mcp-test.env");
await Bun.write(
  testEnvPath,
  [
    "PLAUD_AUTH_TOKEN=test-jwt-token",
    "PLAUD_DEVICE_TAG=test-device-tag",
    "PLAUD_USER_HASH=test-user-hash",
    "PLAUD_DEVICE_ID=test-device-id",
    "",
  ].join("\n")
);
process.env.PLAUD_ENV_FILE = testEnvPath;

// Reset the cached config before each test so .env is re-read
beforeEach(() => {
  _resetConfigCache();
});

// Helper to create a mock fetch response
export function mockFetchResponse(body: unknown, status = 200) {
  return mock(() =>
    Promise.resolve(new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }))
  );
}

// Helper to create a mock fetch that returns text
export function mockFetchText(text: string, status = 200) {
  return mock(() =>
    Promise.resolve(new Response(text, { status }))
  );
}

// Helper that routes different URLs to different responses
export function mockFetchRouter(routes: Record<string, { body: unknown; status?: number } | string>) {
  return mock((url: string | URL | Request, _init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    for (const [pattern, response] of Object.entries(routes)) {
      if (urlStr.includes(pattern)) {
        if (typeof response === "string") {
          return Promise.resolve(new Response(response, { status: 200 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify(response.body), {
            status: response.status ?? 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    }
    return Promise.resolve(new Response("Not found", { status: 404 }));
  });
}
