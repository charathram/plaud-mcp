import { plaudRequest } from "../client.js";
import type { PlaudFile, PlaudFileListResponse, PlaudUserResponse } from "../types.js";

export async function listFiles(args: {
  filter?: "all" | "untranscribed" | "transcribed";
  min_duration_minutes?: number;
}): Promise<string> {
  const res = await plaudRequest<PlaudFileListResponse>("GET", "/file/simple/web");
  let files = res.data_file_list ?? [];

  if (args.filter === "transcribed") {
    files = files.filter((f) => f.is_trans);
  } else if (args.filter === "untranscribed") {
    files = files.filter((f) => !f.is_trans);
  }

  if (args.min_duration_minutes) {
    const minMs = args.min_duration_minutes * 60 * 1000;
    files = files.filter((f) => f.duration >= minMs);
  }

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
  const res = await plaudRequest<{ code: number; data_file: PlaudFile }>(
    "GET",
    `/file/detail/${args.file_id}`
  );
  return JSON.stringify(res.data_file, null, 2);
}

export async function searchFiles(args: {
  query?: string;
  start_date?: string;
  end_date?: string;
}): Promise<string> {
  const res = await plaudRequest<PlaudFileListResponse>("GET", "/file/simple/web");
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

  return JSON.stringify({ count: files.length, files: summary }, null, 2);
}

export async function getUser(): Promise<string> {
  const res = await plaudRequest<PlaudUserResponse>("GET", "/user/me");
  return JSON.stringify(res.data_user, null, 2);
}
