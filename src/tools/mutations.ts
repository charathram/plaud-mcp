import { plaudRequest } from "../client.js";
import type { PlaudPatchResponse } from "../types.js";

export async function renameFile(args: {
  file_id: string;
  new_name: string;
}): Promise<string> {
  const res = await plaudRequest<PlaudPatchResponse>(
    "PATCH",
    `/file/${args.file_id}`,
    { file_name: args.new_name }
  );
  return JSON.stringify({ success: res.code === 0, message: res.message });
}

export async function batchRename(args: {
  renames: { file_id: string; new_name: string }[];
}): Promise<string> {
  const results: { file_id: string; new_name: string; success: boolean }[] = [];

  for (const item of args.renames) {
    const res = await plaudRequest<PlaudPatchResponse>(
      "PATCH",
      `/file/${item.file_id}`,
      { file_name: item.new_name }
    );
    results.push({
      file_id: item.file_id,
      new_name: item.new_name,
      success: res.code === 0,
    });
    // Rate limit between requests
    await Bun.sleep(500);
  }

  return JSON.stringify({ results }, null, 2);
}

export async function moveToFolder(args: {
  file_id: string;
  folder_id: string;
}): Promise<string> {
  const res = await plaudRequest<PlaudPatchResponse>(
    "PATCH",
    `/file/${args.file_id}`,
    { file_tag_id: args.folder_id }
  );
  return JSON.stringify({ success: res.code === 0, message: res.message });
}

export async function trashFile(args: { file_id: string }): Promise<string> {
  const res = await plaudRequest<PlaudPatchResponse>(
    "PATCH",
    `/file/${args.file_id}`,
    { is_deleted: 1 }
  );
  return JSON.stringify({ success: res.code === 0, message: res.message });
}
