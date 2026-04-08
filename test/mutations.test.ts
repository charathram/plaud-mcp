import { describe, test, expect, mock } from "bun:test";
import { mockFetchResponse } from "./setup.js";
import "./setup.js";
import { renameFile, batchRename, moveToFolder, trashFile } from "../src/tools/mutations.js";

describe("renameFile", () => {
  test("sends PATCH with new name", async () => {
    const mockFetch = mockFetchResponse({ status: 0, msg: "ok" });
    globalThis.fetch = mockFetch as any;

    const result = JSON.parse(await renameFile({ file_id: "f1", new_name: "New Name" }));
    expect(result.success).toBe(true);

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.plaud.ai/file/f1");
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body as string)).toEqual({ filename: "New Name" });
  });

  test("reports failure when status != 0", async () => {
    globalThis.fetch = mockFetchResponse({ status: 1, msg: "error" }) as any;

    const result = JSON.parse(await renameFile({ file_id: "f1", new_name: "X" }));
    expect(result.success).toBe(false);
  });
});

describe("batchRename", () => {
  test("renames multiple files sequentially", async () => {
    const mockFetch = mockFetchResponse({ status: 0, msg: "ok" });
    globalThis.fetch = mockFetch as any;

    const renames = [
      { file_id: "f1", new_name: "Name 1" },
      { file_id: "f2", new_name: "Name 2" },
    ];

    const result = JSON.parse(await batchRename({ renames }));
    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);

    // Should have made 2 PATCH calls
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("moveToFolder", () => {
  test("sends PATCH with folder id", async () => {
    const mockFetch = mockFetchResponse({ status: 0, msg: "ok" });
    globalThis.fetch = mockFetch as any;

    const result = JSON.parse(await moveToFolder({ file_id: "f1", folder_id: "folder1" }));
    expect(result.success).toBe(true);

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ file_tag_id: "folder1" });
  });
});

describe("trashFile", () => {
  test("sends PATCH with is_deleted", async () => {
    const mockFetch = mockFetchResponse({ status: 0, msg: "ok" });
    globalThis.fetch = mockFetch as any;

    const result = JSON.parse(await trashFile({ file_id: "f1" }));
    expect(result.success).toBe(true);

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ is_deleted: 1 });
  });
});
