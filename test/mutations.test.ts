import { describe, test, expect, mock } from "bun:test";
import { mockFetchResponse } from "./setup.js";
import "./setup.js";
import { renameFile, batchRename, moveToFolder, trashFile, generate } from "../src/tools/mutations.js";

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

describe("generate", () => {
  test("sends POST with auto defaults", async () => {
    const mockFetch = mockFetchResponse({ status: 0, msg: "ok" });
    globalThis.fetch = mockFetch as any;

    const result = JSON.parse(await generate({ file_id: "f1" }));
    expect(result.success).toBe(true);

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.plaud.ai/ai/transsumm/f1");
    expect(opts.method).toBe("POST");

    const body = JSON.parse(opts.body as string);
    expect(body.is_reload).toBe(0);
    expect(body.summ_type).toBe("AUTO-SELECT");
    expect(body.summ_type_type).toBe("system");
    expect(body.support_mul_summ).toBe(true);

    const info = JSON.parse(body.info);
    expect(info.language).toBe("auto");
    expect(info.diarization).toBe(1);
    expect(info.llm).toBe("auto");
  });

  test("sends POST with custom options", async () => {
    const mockFetch = mockFetchResponse({ status: 0, msg: "ok" });
    globalThis.fetch = mockFetch as any;

    const result = JSON.parse(await generate({
      file_id: "f1",
      language: "en",
      speaker_labeling: false,
      llm: "gpt-4",
      template_id: "abc123",
      template_type: "community",
    }));
    expect(result.success).toBe(true);

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.summ_type).toBe("abc123");
    expect(body.summ_type_type).toBe("community");

    const info = JSON.parse(body.info);
    expect(info.language).toBe("en");
    expect(info.diarization).toBe(0);
    expect(info.llm).toBe("gpt-4");
  });
});
