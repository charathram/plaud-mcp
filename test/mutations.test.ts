import { describe, test, expect, mock } from "bun:test";
import { mockFetchResponse, mockFetchRouter } from "./setup.js";
import "./setup.js";
import { renameFile, batchRename, moveToFolder, trashFile, generate, nameSpeakers } from "../src/tools/mutations.js";

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

const TRANSCRIPT_SEGMENTS = [
  { start_time: 1000, end_time: 2000, content: "Hello", speaker: "Speaker 1", original_speaker: "Speaker 1" },
  { start_time: 3000, end_time: 4000, content: "Hi there", speaker: "Speaker 2", original_speaker: "Speaker 2" },
  { start_time: 5000, end_time: 6000, content: "How are you?", speaker: "Speaker 1", original_speaker: "Speaker 1" },
];

const FILE_DETAIL_WITH_TRANSCRIPT = {
  status: 0,
  msg: "success",
  data: {
    file_id: "f1",
    file_name: "Test",
    file_version: 1,
    duration: 6000,
    is_trash: false,
    start_time: 1000,
    scene: 0,
    serial_number: "",
    session_id: 1,
    wait_pull: 0,
    filetag_id_list: [],
    has_thought_partner: false,
    content_list: [
      { data_id: "src_polish:1:f1", data_type: "transaction_polish", task_status: 1, err_code: "", err_msg: "", data_title: "", data_tab_name: "", data_link: "https://s3.example.com/transcript.json" },
    ],
  },
};

describe("nameSpeakers", () => {
  test("renames speakers across all segments", async () => {
    const mockFetch = mockFetchRouter({
      "api.plaud.ai/file/detail": { body: FILE_DETAIL_WITH_TRANSCRIPT },
      "s3.example.com/transcript": JSON.stringify(TRANSCRIPT_SEGMENTS),
      "api.plaud.ai/file/f1": { body: { status: 0, msg: "ok" } },
      "api.plaud.ai/ai/update_source_info": { body: { status: 0, msg: "ok" } },
    });
    globalThis.fetch = mockFetch as any;

    const result = JSON.parse(await nameSpeakers({
      file_id: "f1",
      renames: [{ old_name: "Speaker 1", new_name: "Alice" }, { old_name: "Speaker 2", new_name: "Bob" }],
    }));

    expect(result.success).toBe(true);
    expect(result.segments_updated).toBe(3);
    expect(result.speakers).toContain("Alice");
    expect(result.speakers).toContain("Bob");

    // Verify the PATCH call has updated speaker names
    const patchCall = mockFetch.mock.calls.find((c: any) => {
      const [url, opts] = c as [string, RequestInit];
      return url.includes("api.plaud.ai/file/f1") && opts?.method === "PATCH";
    }) as [string, RequestInit] | undefined;
    expect(patchCall).toBeDefined();
    const patchBody = JSON.parse(patchCall![1].body as string);
    expect(patchBody.trans_result[0].speaker).toBe("Alice");
    expect(patchBody.trans_result[1].speaker).toBe("Bob");
    expect(patchBody.trans_result[2].speaker).toBe("Alice");
  });

  test("returns error when no matching speakers found", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai/file/detail": { body: FILE_DETAIL_WITH_TRANSCRIPT },
      "s3.example.com/transcript": JSON.stringify(TRANSCRIPT_SEGMENTS),
    }) as any;

    const result = JSON.parse(await nameSpeakers({
      file_id: "f1",
      renames: [{ old_name: "Nobody", new_name: "Someone" }],
    }));

    expect(result.error).toContain("No matching speakers found");
    expect(result.current_speakers).toContain("Speaker 1");
    expect(result.current_speakers).toContain("Speaker 2");
  });

  test("returns error when file has no transcript", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai/file/detail": {
        body: {
          status: 0, msg: "success",
          data: {
            file_id: "f2", file_name: "Empty", file_version: 1, duration: 0,
            is_trash: false, start_time: 0, scene: 0, serial_number: "",
            session_id: 1, wait_pull: 0, filetag_id_list: [],
            has_thought_partner: false, content_list: [],
          },
        },
      },
    }) as any;

    const result = JSON.parse(await nameSpeakers({
      file_id: "f2",
      renames: [{ old_name: "Speaker 1", new_name: "Alice" }],
    }));

    expect(result.error).toContain("No transcript found");
  });
});
