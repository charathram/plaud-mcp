import { plaudRequest } from "../client.js";
import { logger } from "../logger.js";
import { PlaudFolderListResponseSchema } from "../schemas.js";

export async function listFolders(): Promise<string> {
  logger.debug("listFolders called");
  const res = await plaudRequest("GET", "/filetag/", undefined, PlaudFolderListResponseSchema);
  const folders = (res.data_filetag_list ?? []).map((f) => ({
    id: f.id,
    name: f.tag_name ?? null,
  }));
  logger.info(`listFolders returning ${folders.length} folders`);
  return JSON.stringify({ count: folders.length, folders }, null, 2);
}
