import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mockFetchResponse } from "./setup.js";

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
