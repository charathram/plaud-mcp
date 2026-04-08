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

  // File list
  await dumpEndpoint("File List", "GET", "/file/simple/web");

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

  // Folders
  await dumpEndpoint("Folder List", "GET", "/filetag/");

  // User profile
  await dumpEndpoint("User Profile", "GET", "/user/me");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
