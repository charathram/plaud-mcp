import { describe, test, expect } from "bun:test";
import { mockFetchRouter } from "./setup.js";
import "./setup.js";
import { getTranscript, getSummary, exportTranscript } from "../src/tools/content.js";

const FILE_DETAIL = {
  status: 0,
  msg: "success",
  data: {
    file_id: "f1",
    file_name: "Test",
    file_version: 1,
    duration: 100000,
    is_trash: false,
    start_time: 1736071200000,
    scene: 0,
    serial_number: "",
    session_id: 1,
    wait_pull: 0,
    filetag_id_list: [],
    has_thought_partner: false,
    content_list: [
      { data_id: "src_trans:1:f1", data_type: "transaction", task_status: 1, err_code: "", err_msg: "", data_title: "", data_tab_name: "", data_link: "https://s3.example.com/raw-transcript" },
      { data_id: "src_polish:1:f1", data_type: "transaction_polish", task_status: 1, err_code: "", err_msg: "", data_title: "", data_tab_name: "", data_link: "https://s3.example.com/polished-transcript" },
      { data_id: "auto_sum:1:f1", data_type: "auto_sum_note", task_status: 1, err_code: "", err_msg: "", data_title: "Summary", data_tab_name: "Summary", data_link: "https://s3.example.com/summary" },
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
          status: 0,
          msg: "success",
          data: {
            file_id: "f2",
            file_name: "Empty",
            file_version: 1,
            duration: 0,
            is_trash: false,
            start_time: 0,
            scene: 0,
            serial_number: "",
            session_id: 1,
            wait_pull: 0,
            filetag_id_list: [],
            has_thought_partner: false,
            content_list: [],
          },
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

const TRANSCRIPT_SEGMENTS = [
  { start_time: 37600, end_time: 38080, content: "Hey Ray.", speaker: "Aline", original_speaker: "Speaker 1" },
  { start_time: 39160, end_time: 39760, content: "How are you, sir?", speaker: "Ray", original_speaker: "Speaker 2" },
  { start_time: 40060, end_time: 41140, content: "I am good. How are you?", speaker: "charath", original_speaker: "Speaker 3" },
];

const EXPORT_FILE_DETAIL = {
  status: 0,
  msg: "success",
  data: {
    file_id: "f1",
    file_name: "Test",
    file_version: 1,
    duration: 41140,
    is_trash: false,
    start_time: 37600,
    scene: 0,
    serial_number: "",
    session_id: 1,
    wait_pull: 0,
    filetag_id_list: [],
    has_thought_partner: false,
    content_list: [
      { data_id: "src_polish:1:f1", data_type: "transaction_polish", task_status: 1, err_code: "", err_msg: "", data_title: "", data_tab_name: "", data_link: "https://s3.example.com/segments.json" },
    ],
  },
};

describe("exportTranscript", () => {
  test("exports as TXT with timestamps and speakers", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": { body: EXPORT_FILE_DETAIL },
      "segments.json": JSON.stringify(TRANSCRIPT_SEGMENTS),
    }) as any;

    const result = await exportTranscript({ file_id: "f1" });
    expect(result).toContain("00:00:37");
    expect(result).toContain("Aline");
    expect(result).toContain("Hey Ray.");
    expect(result).toContain("Ray");
    expect(result).toContain("How are you, sir?");
  });

  test("exports as TXT without timestamps", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": { body: EXPORT_FILE_DETAIL },
      "segments.json": JSON.stringify(TRANSCRIPT_SEGMENTS),
    }) as any;

    const result = await exportTranscript({ file_id: "f1", include_timestamps: false });
    expect(result).not.toContain("00:00:37");
    expect(result).toContain("Aline");
    expect(result).toContain("Hey Ray.");
  });

  test("exports as TXT without speakers", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": { body: EXPORT_FILE_DETAIL },
      "segments.json": JSON.stringify(TRANSCRIPT_SEGMENTS),
    }) as any;

    const result = await exportTranscript({ file_id: "f1", include_speakers: false });
    expect(result).toContain("00:00:37");
    expect(result).not.toContain("Aline");
    expect(result).toContain("Hey Ray.");
  });

  test("exports as SRT format", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": { body: EXPORT_FILE_DETAIL },
      "segments.json": JSON.stringify(TRANSCRIPT_SEGMENTS),
    }) as any;

    const result = await exportTranscript({ file_id: "f1", format: "srt" });
    expect(result).toContain("1\n");
    expect(result).toContain("00:00:37,600 --> 00:00:38,080");
    expect(result).toContain("Aline: Hey Ray.");
    expect(result).toContain("2\n");
    expect(result).toContain("00:00:39,160 --> 00:00:39,760");
  });

  test("returns error when no transcript exists", async () => {
    globalThis.fetch = mockFetchRouter({
      "api.plaud.ai": {
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

    const result = JSON.parse(await exportTranscript({ file_id: "f2" }));
    expect(result.error).toContain("No transcript found");
  });
});
