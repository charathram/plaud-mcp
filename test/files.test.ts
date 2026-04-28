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

  test("surfaces enriched metadata fields from /file/detail", async () => {
    const data = {
      file_id: "1",
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
      content_list: [
        {
          data_id: "source_transaction:1",
          data_type: "transaction",
          task_status: 1,
          err_code: "",
          err_msg: "",
          data_title: "",
          data_tab_name: "",
          data_link: "https://example.com/transcript",
          extra: { task_id: "trans-task-1" },
        },
        {
          data_id: "auto_sum:1",
          data_type: "auto_sum_note",
          task_status: 1,
          err_code: "",
          err_msg: "",
          data_title: "Summary",
          data_tab_name: "Summary",
          data_link: "https://example.com/summary",
          extra: {
            summary_id: "sum-1",
            summ_type: "REASONING-NOTE",
            summ_type_type: "system",
            used_template: { template_id: "REASONING-NOTE", template_type: "official", template_version_id: "" },
          },
        },
      ],
      has_thought_partner: false,
      embeddings: {
        "Speaker 1": [0.1, -0.2, 0.3],
        "Speaker 2": [-0.4, 0.5, -0.6],
      },
      download_path_mapping: {
        "permanent/poster.png": "https://example.com/poster.png?signed=1",
      },
      pre_download_content_list: [
        { data_id: "auto_sum:1", data_content: '{"ai_content": "# Summary"}' },
      ],
      extra_data: {
        aiContentForm: {},
        aiContentHeader: {
          category: "Reasoning Summary",
          headline: "Test headline",
          keywords: ["topic-a", "topic-b"],
          language_code: "en",
          recommend_questions: [{ category: "key_insights", question: "What happened?" }],
          summary_id: "sum-1",
          used_template: { template_id: "REASONING-NOTE", template_type: "official", template_version_id: "" },
        },
        has_replaced_speaker: false,
        last_trans_app_platform: "WEB",
        last_trans_device_id: "device-x",
        model: "gpt-5",
        task_id_info: { outline_task_id: "outline-1", trans_task_id: "trans-1" },
        tranConfig: { created_at: "2026-04-28T00:00:00", diarization: 1, language: "en", llm: "auto", type: "AUTO-SELECT", type_type: "system" },
        used_template: { template_id: "REASONING-NOTE", template_type: "official", template_version_id: "" },
      },
    };
    globalThis.fetch = mockFetchResponse({ status: 0, msg: "success", data }) as any;

    const result = JSON.parse(await getFile({ file_id: "1" }));
    expect(result.content_list[0].extra.task_id).toBe("trans-task-1");
    expect(result.content_list[1].extra.used_template.template_id).toBe("REASONING-NOTE");
    expect(result.embeddings["Speaker 1"]).toEqual([0.1, -0.2, 0.3]);
    expect(result.download_path_mapping["permanent/poster.png"]).toBe("https://example.com/poster.png?signed=1");
    expect(result.pre_download_content_list[0].data_id).toBe("auto_sum:1");
    expect(result.extra_data.aiContentHeader.headline).toBe("Test headline");
    expect(result.extra_data.aiContentHeader.keywords).toEqual(["topic-a", "topic-b"]);
    expect(result.extra_data.model).toBe("gpt-5");
    expect(result.extra_data.tranConfig.language).toBe("en");
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
