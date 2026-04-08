import { describe, test, expect } from "bun:test";
import { mockFetchRouter } from "./setup.js";
import "./setup.js";
import { getTranscript, getSummary } from "../src/tools/content.js";

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
