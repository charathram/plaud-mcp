import { describe, test, expect } from "bun:test";
import { mockFetchResponse } from "./setup.js";
import "./setup.js";
import { listFolders } from "../src/tools/folders.js";

describe("listFolders", () => {
  test("returns folders", async () => {
    globalThis.fetch = mockFetchResponse({
      status: 0,
      msg: "success",
      data_filetag_total: 2,
      data_filetag_list: [
        { id: "t1", tag_name: "Work" },
        { id: "t2", tag_name: "Personal" },
      ],
    }) as any;

    const result = JSON.parse(await listFolders());
    expect(result.count).toBe(2);
    expect(result.folders[0]).toEqual({ id: "t1", name: "Work" });
    expect(result.folders[1]).toEqual({ id: "t2", name: "Personal" });
  });

  test("handles empty folder list", async () => {
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data_filetag_total: 0, data_filetag_list: [] }) as any;

    const result = JSON.parse(await listFolders());
    expect(result.count).toBe(0);
  });

  test("tolerates folders with missing tag_name", async () => {
    globalThis.fetch = mockFetchResponse({
      status: 0,
      msg: "success",
      data_filetag_total: 3,
      data_filetag_list: [
        { id: "t1", tag_name: "Work" },
        { id: "t2" },
        { id: "t3", tag_name: null },
      ],
    }) as any;

    const result = JSON.parse(await listFolders());
    expect(result.count).toBe(3);
    expect(result.folders).toEqual([
      { id: "t1", name: "Work" },
      { id: "t2", name: null },
      { id: "t3", name: null },
    ]);
  });
});
