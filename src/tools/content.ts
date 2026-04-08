import { plaudRequest } from "../client.js";
import { logger } from "../logger.js";
import { PlaudFileDetailResponseSchema } from "../schemas.js";

async function fetchContent(fileId: string, contentType: string): Promise<string> {
  logger.debug("fetchContent called", { fileId, contentType });
  const res = await plaudRequest(
    "GET",
    `/file/detail/${fileId}`,
    undefined,
    PlaudFileDetailResponseSchema,
  );

  const item = res.data?.content_list?.find((c) => c.type === contentType);
  if (!item?.url) {
    logger.warn(`No ${contentType} content found`, { fileId });
    return JSON.stringify({
      error: `No ${contentType} content found for file ${fileId}`,
    });
  }

  logger.debug("Fetching content from S3", { contentType, url: item.url });
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
