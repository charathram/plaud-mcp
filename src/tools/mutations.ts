import { plaudRequest } from "../client.js";
import { logger } from "../logger.js";
import { PlaudPatchResponseSchema } from "../schemas.js";

export async function renameFile(args: {
  file_id: string;
  new_name: string;
}): Promise<string> {
  logger.debug("renameFile called", { file_id: args.file_id, new_name: args.new_name });
  const res = await plaudRequest(
    "PATCH",
    `/file/${args.file_id}`,
    { filename: args.new_name },
    PlaudPatchResponseSchema,
  );
  logger.info(`renameFile ${res.code === 0 ? "succeeded" : "failed"}`, { file_id: args.file_id });
  return JSON.stringify({ success: res.code === 0, message: res.message });
}

export async function batchRename(args: {
  renames: { file_id: string; new_name: string }[];
}): Promise<string> {
  const results: { file_id: string; new_name: string; success: boolean }[] = [];

  logger.debug("batchRename called", { count: args.renames.length });
  for (const item of args.renames) {
    const res = await plaudRequest(
      "PATCH",
      `/file/${item.file_id}`,
      { filename: item.new_name },
      PlaudPatchResponseSchema,
    );
    results.push({
      file_id: item.file_id,
      new_name: item.new_name,
      success: res.code === 0,
    });
    // Rate limit between requests
    await Bun.sleep(500);
  }

  const succeeded = results.filter((r) => r.success).length;
  logger.info(`batchRename complete: ${succeeded}/${results.length} succeeded`);
  return JSON.stringify({ results }, null, 2);
}

export async function moveToFolder(args: {
  file_id: string;
  folder_id: string;
}): Promise<string> {
  logger.debug("moveToFolder called", { file_id: args.file_id, folder_id: args.folder_id });
  const res = await plaudRequest(
    "PATCH",
    `/file/${args.file_id}`,
    { file_tag_id: args.folder_id },
    PlaudPatchResponseSchema,
  );
  return JSON.stringify({ success: res.code === 0, message: res.message });
}

export async function trashFile(args: { file_id: string }): Promise<string> {
  logger.debug("trashFile called", { file_id: args.file_id });
  const res = await plaudRequest(
    "PATCH",
    `/file/${args.file_id}`,
    { is_deleted: 1 },
    PlaudPatchResponseSchema,
  );
  return JSON.stringify({ success: res.code === 0, message: res.message });
}
