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
});
