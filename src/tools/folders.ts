import { plaudRequest } from "../client.js";
import type { PlaudFolderListResponse } from "../types.js";

export async function listFolders(): Promise<string> {
  const res = await plaudRequest<PlaudFolderListResponse>("GET", "/filetag/");
  const folders = (res.data_tag_list ?? []).map((f) => ({
    id: f.id,
    name: f.tag_name,
  }));
  return JSON.stringify({ count: folders.length, folders }, null, 2);
}
