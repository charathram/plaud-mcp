import { describe, test, expect } from "bun:test";
import { mockFetchResponse } from "./setup.js";
import "./setup.js";
import { listFiles, getFile, searchFiles, getUser } from "../src/tools/files.js";

const MOCK_FILES = [
  { id: "1", filename: "Meeting Jan 5", filesize: 1000, filetype: "wav", fullname: "", file_md5: "", ori_ready: true, version: 1, version_ms: 0, edit_time: 0, edit_from: "web", is_trash: false, start_time: 1736071200000, end_time: 1736074800000, duration: 3600000, timezone: -8, zonemins: -480, scene: 0, filetag_id_list: [], serial_number: "", is_trans: true, is_summary: true, is_markmemo: false, wait_pull: 0, keywords: [] },
  { id: "2", filename: "Recording 1234", filesize: 500, filetype: "wav", fullname: "", file_md5: "", ori_ready: true, version: 1, version_ms: 0, edit_time: 0, edit_from: "web", is_trash: false, start_time: 1736172000000, end_time: 1736172120000, duration: 120000, timezone: -8, zonemins: -480, scene: 0, filetag_id_list: [], serial_number: "", is_trans: false, is_summary: false, is_markmemo: false, wait_pull: 0, keywords: [] },
  { id: "3", filename: "Call with Bob", filesize: 800, filetype: "wav", fullname: "", file_md5: "", ori_ready: true, version: 1, version_ms: 0, edit_time: 0, edit_from: "web", is_trash: false, start_time: 1736240400000, end_time: 1736242200000, duration: 1800000, timezone: -8, zonemins: -480, scene: 0, filetag_id_list: [], serial_number: "", is_trans: true, is_summary: true, is_markmemo: false, wait_pull: 0, keywords: [] },
];

describe("listFiles", () => {
  test("returns all files with no filter", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 3, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({}));
    expect(result.count).toBe(3);
    expect(result.files).toHaveLength(3);
  });

  test("filters transcribed files", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 3, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({ filter: "transcribed" }));
    expect(result.count).toBe(2);
    expect(result.files.every((f: any) => f.transcribed === true)).toBe(true);
  });

  test("filters untranscribed files", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 3, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({ filter: "untranscribed" }));
    expect(result.count).toBe(1);
    expect(result.files[0].id).toBe("2");
  });

  test("filters by minimum duration", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 3, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({ min_duration_minutes: 10 }));
    expect(result.count).toBe(2);
    // 120000ms = 2 minutes, should be excluded
    expect(result.files.find((f: any) => f.id === "2")).toBeUndefined();
  });

  test("combines filter and min_duration", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 3, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await listFiles({ filter: "transcribed", min_duration_minutes: 45 }));
    expect(result.count).toBe(1);
    expect(result.files[0].id).toBe("1");
  });

  test("handles empty file list", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 0, data_file_list: [] }) as any;

    const result = JSON.parse(await listFiles({}));
    expect(result.count).toBe(0);
    expect(result.files).toHaveLength(0);
  });
});

describe("getFile", () => {
  test("returns file detail", async () => {
    const data = { file_id: "1", file_name: "Test", file_version: 1, duration: 100000, is_trash: false, start_time: 1736071200000, scene: 0, serial_number: "", session_id: 1, wait_pull: 0, filetag_id_list: [], content_list: [], has_thought_partner: false };
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data }) as any;

    const result = JSON.parse(await getFile({ file_id: "1" }));
    expect(result.file_id).toBe("1");
    expect(result.file_name).toBe("Test");
  });
});

describe("searchFiles", () => {
  test("searches by keyword", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 3, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await searchFiles({ query: "meeting" }));
    expect(result.count).toBe(1);
    expect(result.files[0].name).toBe("Meeting Jan 5");
  });

  test("searches by date range", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 3, data_file_list: MOCK_FILES }) as any;

    const result = JSON.parse(await searchFiles({
      start_date: "2025-01-06T00:00:00Z",
      end_date: "2025-01-06T23:59:59Z",
    }));
    expect(result.count).toBe(1);
    expect(result.files[0].id).toBe("2");
  });

  test("combines query and date range", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_file_total: 3, data_file_list: MOCK_FILES }) as any;

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
    globalThis.fetch = mockFetchResponse({ status: 0, data_user: { id: "u1", nickname: "test" } }) as any;

    const result = JSON.parse(await getUser());
    expect(result.nickname).toBe("test");
  });
});
