import { describe, test, expect } from "bun:test";
import { mockFetchResponse } from "./setup.js";
import "./setup.js";
import { listFiles, getFile, searchFiles, getUser } from "../src/tools/files.js";

const MOCK_FILES = [
  { id: "1", filename: "Meeting Jan 5", duration: 3600000, start_time: 1736071200000, is_trans: true, is_summary: true },
  { id: "2", filename: "Recording 1234", duration: 120000, start_time: 1736172000000, is_trans: false, is_summary: false },
  { id: "3", filename: "Call with Bob", duration: 1800000, start_time: 1736240400000, is_trans: true, is_summary: true },
];

describe("listFiles", () => {
  test("returns all files with no filter", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({}));
    expect(result.count).toBe(3);
    expect(result.files).toHaveLength(3);
  });

  test("filters transcribed files", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({ filter: "transcribed" }));
    expect(result.count).toBe(2);
    expect(result.files.every((f: any) => f.transcribed === true)).toBe(true);
  });

  test("filters untranscribed files", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({ filter: "untranscribed" }));
    expect(result.count).toBe(1);
    expect(result.files[0].id).toBe("2");
  });

  test("filters by minimum duration", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({ min_duration_minutes: 10 }));
    expect(result.count).toBe(2);
    // 120000ms = 2 minutes, should be excluded
    expect(result.files.find((f: any) => f.id === "2")).toBeUndefined();
  });

  test("combines filter and min_duration", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({ filter: "transcribed", min_duration_minutes: 45 }));
    expect(result.count).toBe(1);
    expect(result.files[0].id).toBe("1");
  });

  test("handles empty file list", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: [] }) as any;

    const result = JSON.parse(await listFiles({}));
    expect(result.count).toBe(0);
    expect(result.files).toHaveLength(0);
  });
});

describe("getFile", () => {
  test("returns file detail", async () => {
    const file = { id: "1", filename: "Test", duration: 100000, content_list: [] };
    globalThis.fetch = mockFetchResponse({ code: 0, data_file: file }) as any;

    const result = JSON.parse(await getFile({ file_id: "1" }));
    expect(result.id).toBe("1");
    expect(result.filename).toBe("Test");
  });
});

describe("searchFiles", () => {
  test("searches by keyword", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await searchFiles({ query: "meeting" }));
    expect(result.count).toBe(1);
    expect(result.files[0].name).toBe("Meeting Jan 5");
  });

  test("searches by date range", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await searchFiles({
      start_date: "2025-01-06T00:00:00Z",
      end_date: "2025-01-06T23:59:59Z",
    }));
    expect(result.count).toBe(1);
    expect(result.files[0].id).toBe("2");
  });

  test("combines query and date range", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await searchFiles({
      query: "call",
      start_date: "2025-01-07T00:00:00Z",
    }));
    expect(result.count).toBe(1);
    expect(result.files[0].id).toBe("3");
  });
});

describe("getUser", () => {
  test("returns user data", async () => {
    globalThis.fetch = mockFetchResponse({ code: 0, data_user: { id: "u1", nickname: "test" } }) as any;

    const result = JSON.parse(await getUser());
    expect(result.nickname).toBe("test");
  });
});
