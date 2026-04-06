import { plaudRequest } from "../client.js";
import type { PlaudFile, PlaudFileListResponse, PlaudUserResponse } from "../types.js";

export async function listFiles(args: {
  filter?: "all" | "untranscribed" | "transcribed";
  min_duration_minutes?: number;
}): Promise<string> {
  const res = await plaudRequest<PlaudFileListResponse>("GET", "/file/simple/web");
  let files = res.data_file_list ?? [];

  if (args.filter === "transcribed") {
    files = files.filter((f) => f.trans_status === 1);
  } else if (args.filter === "untranscribed") {
    files = files.filter((f) => f.trans_status !== 1);
  }

  if (args.min_duration_minutes) {
    const minSeconds = args.min_duration_minutes * 60;
    files = files.filter((f) => f.duration >= minSeconds);
  }

  const summary = files.map((f) => ({
    id: f.id,
    name: f.file_name,
    duration_min: Math.round(f.duration / 60),
    created_at: f.created_at,
    transcribed: f.trans_status === 1,
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
    files = files.filter((f) => f.file_name.toLowerCase().includes(q));
  }

  if (args.start_date) {
    const start = new Date(args.start_date).getTime();
    files = files.filter((f) => new Date(f.created_at).getTime() >= start);
  }

  if (args.end_date) {
    const end = new Date(args.end_date).getTime();
    files = files.filter((f) => new Date(f.created_at).getTime() <= end);
  }

  const summary = files.map((f) => ({
    id: f.id,
    name: f.file_name,
    duration_min: Math.round(f.duration / 60),
    created_at: f.created_at,
  }));

  return JSON.stringify({ count: files.length, files: summary }, null, 2);
}

export async function getUser(): Promise<string> {
  const res = await plaudRequest<PlaudUserResponse>("GET", "/user/me");
  return JSON.stringify(res.data_user, null, 2);
}
