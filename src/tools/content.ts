import { plaudRequest } from "../client.js";
import type { PlaudFileDetailResponse } from "../types.js";

async function fetchContent(fileId: string, contentType: string): Promise<string> {
  const res = await plaudRequest<PlaudFileDetailResponse>(
    "GET",
    `/file/detail/${fileId}`
  );

  const item = res.data_file?.content_list?.find((c) => c.type === contentType);
  if (!item?.url) {
    return JSON.stringify({
      error: `No ${contentType} content found for file ${fileId}`,
    });
  }

  const textRes = await fetch(item.url);
  if (!textRes.ok) {
    throw new Error(`Failed to fetch ${contentType} from S3: ${textRes.status}`);
  }

  return textRes.text();
}

export async function getTranscript(args: {
  file_id: string;
  type?: "raw" | "polished";
}): Promise<string> {
  const contentType =
    args.type === "polished" ? "transaction_polish" : "transaction";
  return fetchContent(args.file_id, contentType);
}

export async function getSummary(args: { file_id: string }): Promise<string> {
  return fetchContent(args.file_id, "auto_sum_note");
}
