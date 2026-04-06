import { describe, test, expect } from "bun:test";
import { mockFetchResponse } from "./setup.js";
import "./setup.js";
import { listFiles, getFile, searchFiles, getUser } from "../src/tools/files.js";

const MOCK_FILES = [
  { id: "1", file_name: "Meeting Jan 5", duration: 3600, created_at: "2025-01-05T10:00:00Z", trans_status: 1 },
  { id: "2", file_name: "Recording 1234", duration: 120, created_at: "2025-01-06T14:00:00Z", trans_status: 0 },
  { id: "3", file_name: "Call with Bob", duration: 1800, created_at: "2025-01-07T09:00:00Z", trans_status: 1 },
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
    // 120 seconds = 2 minutes, should be excluded
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
    const file = { id: "1", file_name: "Test", duration: 100, content_list: [] };
    globalThis.fetch = mockFetchResponse({ code: 0, data_file: file }) as any;

    const result = JSON.parse(await getFile({ file_id: "1" }));
    expect(result.id).toBe("1");
    expect(result.file_name).toBe("Test");
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
