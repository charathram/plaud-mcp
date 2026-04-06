import { describe, test, expect } from "bun:test";
import { mockFetchRouter } from "./setup.js";
import "./setup.js";
import { getTranscript, getSummary } from "../src/tools/content.js";

const FILE_DETAIL = {
  code: 0,
  data_file: {
    id: "f1",
    file_name: "Test",
    duration: 100,
    created_at: "2025-01-01T00:00:00Z",
    content_list: [
      { type: "transaction", url: "https://s3.example.com/raw-transcript" },
      { type: "transaction_polish", url: "https://s3.example.com/polished-transcript" },
      { type: "auto_sum_note", url: "https://s3.example.com/summary" },
    ],
  },
};

describe("getTranscript", () => {
  test("fetches raw transcript by default", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": { body: FILE_DETAIL },
      "raw-transcript": "Hello, this is the raw transcript.",
    }) as any;

    const result = await getTranscript({ file_id: "f1" });
    expect(result).toBe("Hello, this is the raw transcript.");
  });

  test("fetches polished transcript when type=polished", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": { body: FILE_DETAIL },
      "polished-transcript": "Hello, this is the polished transcript.",
    }) as any;

    const result = await getTranscript({ file_id: "f1", type: "polished" });
    expect(result).toBe("Hello, this is the polished transcript.");
  });

  test("returns error when content type not found", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": {
        body: {
          code: 0,
          data_file: { id: "f2", content_list: [] },
        },
      },
    }) as any;

    const result = JSON.parse(await getTranscript({ file_id: "f2" }));
    expect(result.error).toContain("No transaction content found");
  });
});

describe("getSummary", () => {
  test("fetches summary", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": { body: FILE_DETAIL },
      "summary": "Meeting summary: discussed project timeline.",
    }) as any;

    const result = await getSummary({ file_id: "f1" });
    expect(result).toBe("Meeting summary: discussed project timeline.");
  });
});
