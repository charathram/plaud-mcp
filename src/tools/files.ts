import { plaudRequest } from "../client.js";
import { logger } from "../logger.js";
import { PlaudFileListResponseSchema, PlaudFileDetailResponseSchema, PlaudUserResponseSchema } from "../schemas.js";

export async function listFiles(args: {
  filter?: "all" | "untranscribed" | "transcribed";
  min_duration_minutes?: number;
}): Promise<string> {
  logger.debug("listFiles called", { filter: args.filter, min_duration_minutes: args.min_duration_minutes });

  const res = await plaudRequest("GET", "/file/simple/web", undefined, PlaudFileListResponseSchema);
  let files = res.data_file_list ?? [];
  logger.debug("Fetched file list", { total: files.length });

  if (args.filter === "transcribed") {
    files = files.filter((f) => f.is_trans);
  } else if (args.filter === "untranscribed") {
    files = files.filter((f) => !f.is_trans);
  }

  if (args.min_duration_minutes) {
    const minMs = args.min_duration_minutes * 60 * 1000;
    files = files.filter((f) => f.duration >= minMs);
  }

  logger.info(`listFiles returning ${files.length} files`, { filter: args.filter ?? "all" });

  const summary = files.map((f) => ({
    id: f.id,
    name: f.filename,
    duration_min: Math.round(f.duration / 60000),
    created_at: new Date(f.start_time).toISOString(),
    transcribed: f.is_trans,
    has_summary: f.is_summary,
  }));

  return JSON.stringify({ count: files.length, files: summary }, null, 2);
}

export async function getFile(args: { file_id: string }): Promise<string> {
  logger.debug("getFile called", { file_id: args.file_id });
  const res = await plaudRequest(
    "GET",
    `/file/detail/${args.file_id}`,
    undefined,
    PlaudFileDetailResponseSchema,
  );
  return JSON.stringify(res.data, null, 2);
}

export async function searchFiles(args: {
  query?: string;
  start_date?: string;
  end_date?: string;
}): Promise<string> {
  logger.debug("searchFiles called", { query: args.query, start_date: args.start_date, end_date: args.end_date });
  const res = await plaudRequest("GET", "/file/simple/web", undefined, PlaudFileListResponseSchema);
  let files = res.data_file_list ?? [];

  if (args.query) {
    const q = args.query.toLowerCase();
    files = files.filter((f) => f.filename.toLowerCase().includes(q));
  }

  if (args.start_date) {
    const start = new Date(args.start_date).getTime();
    files = files.filter((f) => f.start_time >= start);
  }

  if (args.end_date) {
    const end = new Date(args.end_date).getTime();
    files = files.filter((f) => f.start_time <= end);
  }

  const summary = files.map((f) => ({
    id: f.id,
    name: f.filename,
    duration_min: Math.round(f.duration / 60000),
    created_at: new Date(f.start_time).toISOString(),
  }));

  logger.info(`searchFiles returning ${files.length} results`, { query: args.query });
  return JSON.stringify({ count: files.length, files: summary }, null, 2);
}

export async function getUser(): Promise<string> {
  logger.debug("getUser called");
  const res = await plaudRequest("GET", "/user/me", undefined, PlaudUserResponseSchema);
  return JSON.stringify(res.data_user, null, 2);
}
