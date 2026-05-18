import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mockFetchResponse } from "./setup.js";
import { tmpdir } from "os";
import { join } from "path";

// Must import setup first to configure env
import "./setup.js";
import { plaudRequest, _resetConfigCache } from "../src/client.js";

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

describe("plaudRequest base URL resolution", () => {
  const defaultEnvPath = process.env.PLAUD_ENV_FILE;

  afterEach(() => {
    delete process.env.PLAUD_API_BASE_URL;
    if (defaultEnvPath) {
      process.env.PLAUD_ENV_FILE = defaultEnvPath;
    } else {
      delete process.env.PLAUD_ENV_FILE;
    }
    _resetConfigCache();
  });

  test("defaults to https://api.plaud.ai", async () => {
    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.plaud.ai/user/me");
  });

  test("respects PLAUD_API_BASE_URL env var", async () => {
    process.env.PLAUD_API_BASE_URL = "https://api-euc1.plaud.ai";
    _resetConfigCache();
    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api-euc1.plaud.ai/user/me");
  });

  test("reads PLAUD_API_BASE_URL from .env file", async () => {
    const envFilePath = join(tmpdir(), "plaud-mcp-baseurl-test.env");
    await Bun.write(
      envFilePath,
      [
        "PLAUD_AUTH_TOKEN=test-jwt-token",
        "PLAUD_DEVICE_TAG=test-device-tag",
        "PLAUD_USER_HASH=test-user-hash",
        "PLAUD_DEVICE_ID=test-device-id",
        "PLAUD_API_BASE_URL=https://api-apac1.plaud.ai",
        "",
      ].join("\n"),
    );
    process.env.PLAUD_ENV_FILE = envFilePath;
    _resetConfigCache();
    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api-apac1.plaud.ai/user/me");
  });

  test("env var takes precedence over .env file", async () => {
    const envFilePath = join(tmpdir(), "plaud-mcp-baseurl-test.env");
    await Bun.write(
      envFilePath,
      [
        "PLAUD_AUTH_TOKEN=test-jwt-token",
        "PLAUD_DEVICE_TAG=test-device-tag",
        "PLAUD_USER_HASH=test-user-hash",
        "PLAUD_DEVICE_ID=test-device-id",
        "PLAUD_API_BASE_URL=https://api-apac1.plaud.ai",
        "",
      ].join("\n"),
    );
    process.env.PLAUD_ENV_FILE = envFilePath;
    process.env.PLAUD_API_BASE_URL = "https://api-euc1.plaud.ai";
    _resetConfigCache();
    const mockFetch = mockFetchResponse({ code: 0 });
    globalThis.fetch = mockFetch as any;

    await plaudRequest("GET", "/user/me");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api-euc1.plaud.ai/user/me");
  });
});
