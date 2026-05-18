import { describe, test, expect } from "bun:test";
import { isPlaudApiUrl } from "../src/login.js";

describe("isPlaudApiUrl (regional login filter)", () => {
  test("matches US default api.plaud.ai", () => {
    expect(isPlaudApiUrl("https://api.plaud.ai/user/me")).toBe(true);
  });

  test("matches EU region api-euc1.plaud.ai", () => {
    expect(isPlaudApiUrl("https://api-euc1.plaud.ai/user/me")).toBe(true);
  });

  test("matches APAC region api-apac1.plaud.ai", () => {
    expect(isPlaudApiUrl("https://api-apac1.plaud.ai/file/detail/abc")).toBe(true);
  });

  test("matches arbitrary alphanumeric region", () => {
    expect(isPlaudApiUrl("https://api-foo123.plaud.ai/anything")).toBe(true);
  });

  test("does not match web.plaud.ai (login page host)", () => {
    expect(isPlaudApiUrl("https://web.plaud.ai/login")).toBe(false);
  });

  test("does not match unrelated host", () => {
    expect(isPlaudApiUrl("https://example.com/api/v1/users")).toBe(false);
  });
});
