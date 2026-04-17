import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { unlink } from "fs/promises";
import { mockFetchResponse } from "./setup.js";

// Must import setup first to configure env
import "./setup.js";
import { plaudRequest, _resetConfigCache } from "../src/client.js";
import { writeCachedCredentials } from "../src/credentials.js";

describe("plaudRequest", () => {
  test("sends correct auth headers", async () => {
    const mockFetch = mockFetchResponse({ code: 0, data: "ok" });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.plaud.ai/user/me");
    expect(opts.method).toBe("GET");
    expect(opts.headers).toMatchObject({
      Authorization: "bearer test-jwt-token",
      "x-pld-tag": "test-device-tag",
      "x-pld-user": "test-user-hash",
      "x-device-id": "test-device-id",
      "app-platform": "web",
      timezone: "America/Los_Angeles",
    });
  });

  test("includes Content-Type for requests with body", async () => {
    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("PATCH", "/file/123", { file_name: "new" });

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(opts.body).toBe(JSON.stringify({ file_name: "new" }));
  });

  test("does not include Content-Type for GET requests", async () => {
    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/file/simple/web");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  test("throws on 401 with token expired message", async () => {
    globalThis.fetch = mockFetchResponse({}, 401) as any;

    expect(plaudRequest("GET", "/user/me")).rejects.toThrow("token expired");
  });

  test("throws on non-ok response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Server Error", { status: 500 }))
    ) as any;

    expect(plaudRequest("GET", "/bad")).rejects.toThrow("failed (500)");
  });
});

describe("credential loading precedence", () => {
  const envKeys = [
    "PLAUD_AUTH_TOKEN",
    "PLAUD_DEVICE_TAG",
    "PLAUD_USER_HASH",
    "PLAUD_DEVICE_ID",
  ] as const;

  const cachePath = process.env.PLAUD_CREDENTIALS_FILE!;

  afterEach(async () => {
    for (const k of envKeys) delete process.env[k];
    await unlink(cachePath).catch(() => {});
  });

  test("cache file takes precedence over process.env credentials", async () => {
    // Cache is written by plaud_login and represents the latest user intent.
    // Stale MCPB user_config env vars must not override it.
    await writeCachedCredentials({
      authToken: "cache-jwt",
      deviceTag: "cache-tag",
      userHash: "cache-hash",
      deviceId: "cache-device",
    });
    process.env.PLAUD_AUTH_TOKEN = "env-jwt";
    process.env.PLAUD_DEVICE_TAG = "env-tag";
    process.env.PLAUD_USER_HASH = "env-hash";
    process.env.PLAUD_DEVICE_ID = "env-device";
    _resetConfigCache();

    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.headers).toMatchObject({
      Authorization: "bearer cache-jwt",
      "x-pld-tag": "cache-tag",
      "x-pld-user": "cache-hash",
      "x-device-id": "cache-device",
    });
  });

  test("process.env is used when no cache file exists", async () => {
    process.env.PLAUD_AUTH_TOKEN = "env-jwt";
    process.env.PLAUD_DEVICE_TAG = "env-tag";
    process.env.PLAUD_USER_HASH = "env-hash";
    process.env.PLAUD_DEVICE_ID = "env-device";
    _resetConfigCache();

    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.headers).toMatchObject({
      Authorization: "bearer env-jwt",
      "x-pld-tag": "env-tag",
      "x-pld-user": "env-hash",
      "x-device-id": "env-device",
    });
  });

  test("partial env vars: missing siblings default to empty string", async () => {
    process.env.PLAUD_AUTH_TOKEN = "only-token";
    _resetConfigCache();

    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.headers).toMatchObject({
      Authorization: "bearer only-token",
      "x-pld-tag": "",
      "x-pld-user": "",
      "x-device-id": "",
    });
  });

  test("cache file takes precedence over .env file when no env vars set", async () => {
    await writeCachedCredentials({
      authToken: "cache-jwt",
      deviceTag: "cache-tag",
      userHash: "cache-hash",
      deviceId: "cache-device",
    });
    _resetConfigCache();

    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.headers).toMatchObject({
      Authorization: "bearer cache-jwt",
      "x-pld-tag": "cache-tag",
      "x-pld-user": "cache-hash",
      "x-device-id": "cache-device",
    });
  });

  test("falls back to .env file when no env vars and no cache", async () => {
    _resetConfigCache();

    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.headers).toMatchObject({
      Authorization: "bearer test-jwt-token",
      "x-pld-tag": "test-device-tag",
      "x-pld-user": "test-user-hash",
      "x-device-id": "test-device-id",
    });
  });

  test("throws helpful error pointing to plaud_login when no credentials exist anywhere", async () => {
    const priorEnvFile = process.env.PLAUD_ENV_FILE;
    process.env.PLAUD_ENV_FILE = "/tmp/plaud-mcp-definitely-does-not-exist-xyz.env";
    _resetConfigCache();

    try {
      await expect(plaudRequest("GET", "/user/me")).rejects.toThrow(/plaud_login/);
    } finally {
      process.env.PLAUD_ENV_FILE = priorEnvFile;
    }
  });
});
