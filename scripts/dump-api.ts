/**
 * Dump raw Plaud API responses for schema discovery.
 * Usage: bun scripts/dump-api.ts [--env path/to/.env]
 *
 * Calls each known endpoint and prints the raw JSON along with a field type summary.
 * Use this to verify that src/schemas.ts matches the real API.
 */

import { plaudRequest } from "../src/client.js";

function summarizeFields(obj: unknown, prefix = ""): string[] {
  if (obj === null || obj === undefined) return [`${prefix}: ${obj}`];
  if (Array.isArray(obj)) {
    if (obj.length === 0) return [`${prefix}: [] (empty array)`];
    return [`${prefix}: Array[${obj.length}]`, ...summarizeFields(obj[0], `${prefix}[0]`)];
  }
  if (typeof obj === "object") {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        lines.push(`${path}: object`);
        lines.push(...summarizeFields(value, path));
      } else if (Array.isArray(value)) {
        lines.push(...summarizeFields(value, path));
      } else {
        const sample = typeof value === "string" && value.length > 60
          ? `"${value.slice(0, 60)}..."`
          : JSON.stringify(value);
        lines.push(`${path}: ${typeof value} = ${sample}`);
      }
    }
    return lines;
  }
  return [`${prefix}: ${typeof obj} = ${JSON.stringify(obj)}`];
}

async function dumpEndpoint(name: string, method: string, path: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${name}: ${method} ${path}`);
  console.log("=".repeat(60));

  try {
    const data = await plaudRequest(method, path);
    console.log("\n--- Raw JSON ---");
    console.log(JSON.stringify(data, null, 2));
    console.log("\n--- Field Summary ---");
    for (const line of summarizeFields(data)) {
      console.log(`  ${line}`);
    }
  } catch (err) {
    console.error(`  ERROR: ${err}`);
  }
}

async function main() {
  console.log("Plaud API Response Dump");
  console.log(`Date: ${new Date().toISOString()}`);

  // File list (live recordings)
  await dumpEndpoint("File List", "GET", "/file/simple/web");

  // File list (trashed recordings) — same field shape but separate endpoint call
  await dumpEndpoint("File List (Trashed)", "GET", "/file/simple/web?is_trash=1");

  // File detail (uses first file from list)
  try {
    const list = await plaudRequest<{ data_file_list: { id: string }[] }>("GET", "/file/simple/web");
    const firstFile = list.data_file_list?.[0];
    if (firstFile) {
      await dumpEndpoint("File Detail", "GET", `/file/detail/${firstFile.id}`);
    } else {
      console.log("\nSkipping File Detail — no files in account");
    }
  } catch {
    console.log("\nSkipping File Detail — could not fetch file list");
  }

  // File detail for a transcribed file (to see content_list shape)
  try {
    const list = await plaudRequest<{ data_file_list: { id: string; is_trans: boolean }[] }>("GET", "/file/simple/web");
    const transcribedFile = list.data_file_list?.find((f) => f.is_trans);
    if (transcribedFile) {
      await dumpEndpoint("File Detail (transcribed)", "GET", `/file/detail/${transcribedFile.id}`);
    } else {
      console.log("\nSkipping transcribed File Detail — no transcribed files in account");
    }
  } catch {
    console.log("\nSkipping transcribed File Detail — could not fetch file list");
  }

  // Folders
  await dumpEndpoint("Folder List", "GET", "/filetag/");

  // User profile
  await dumpEndpoint("User Profile", "GET", "/user/me");

  // Transcription task status
  await dumpEndpoint("Task Status", "GET", "/ai/file-task-status");

  // Transcription status
  await dumpEndpoint("Transcription Status", "GET", "/ai/trans-status");

  // Note: POST /ai/transsumm/{file_id} is not called here to avoid triggering
  // real transcription. The request body shape is:
  // {
  //   "is_reload": 0,
  //   "summ_type": "AUTO-SELECT" | "<template_id>",
  //   "summ_type_type": "system" | "community",
  //   "info": "{\"language\":\"auto\",\"timezone\":-7,\"diarization\":1,\"llm\":\"auto\"}",
  //   "support_mul_summ": true
  // }
  console.log(`\n${"=".repeat(60)}`);
  console.log("Generate (POST /ai/transsumm/{file_id}) — NOT CALLED (would trigger transcription)");
  console.log("=".repeat(60));
  console.log("See src/tools/mutations.ts generate() for request body shape.");

  // Export transcript — client-side only, no API endpoint
  console.log(`\n${"=".repeat(60)}`);
  console.log("Export Transcript — CLIENT-SIDE (no API endpoint)");
  console.log("=".repeat(60));
  console.log("The web UI exports transcripts by fetching the transcript segments");
  console.log("from S3 (via content_list data_link) and formatting them locally.");
  console.log("Supported formats: TXT, SRT, DOCX, PDF");
  console.log("Options: include_timestamps, include_speakers");
  console.log("See src/tools/content.ts exportTranscript() for implementation.");

  // Dump a sample transcript segment shape from a transcribed file
  try {
    const list = await plaudRequest<{ data_file_list: { id: string; is_trans: boolean }[] }>("GET", "/file/simple/web");
    const transcribedFile = list.data_file_list?.find((f) => f.is_trans);
    if (transcribedFile) {
      const detail = await plaudRequest<{ data: { content_list: { data_type: string; data_link: string }[] } }>("GET", `/file/detail/${transcribedFile.id}`);
      const polished = detail.data?.content_list?.find((c) => c.data_type === "transaction_polish");
      const raw = detail.data?.content_list?.find((c) => c.data_type === "transaction");
      const source = polished ?? raw;
      if (source?.data_link) {
        const segRes = await fetch(source.data_link);
        if (segRes.ok) {
          const segments = await segRes.json() as unknown[];
          console.log(`\n--- Transcript Segment Shape (from ${source.data_type}) ---`);
          console.log(JSON.stringify(segments[0], null, 2));
          console.log(`  (${segments.length} segments total)`);
        }
      }
    }
  } catch {
    console.log("  Could not fetch transcript segments for shape inspection");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
