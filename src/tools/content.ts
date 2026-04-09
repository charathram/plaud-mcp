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

  const item = res.data?.content_list?.find((c) => c.data_type === contentType);
  if (!item?.data_link) {
    logger.warn(`No ${contentType} content found`, { fileId });
    return JSON.stringify({
      error: `No ${contentType} content found for file ${fileId}`,
    });
  }

  logger.debug("Fetching content from S3", { contentType, url: item.data_link });
  const textRes = await fetch(item.data_link);
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

interface TranscriptSegment {
  start_time: number;
  end_time: number;
  content: string;
  speaker: string;
  original_speaker: string;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSrtTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const millis = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

async function fetchTranscriptSegments(fileId: string): Promise<TranscriptSegment[] | null> {
  const res = await plaudRequest(
    "GET",
    `/file/detail/${fileId}`,
    undefined,
    PlaudFileDetailResponseSchema,
  );

  const polished = res.data?.content_list?.find((c) => c.data_type === "transaction_polish");
  const raw = res.data?.content_list?.find((c) => c.data_type === "transaction");
  const source = polished ?? raw;

  if (!source?.data_link) return null;

  const textRes = await fetch(source.data_link);
  if (!textRes.ok) throw new Error(`Failed to fetch transcript from S3: ${textRes.status}`);
  return textRes.json();
}

export async function exportTranscript(args: {
  file_id: string;
  format?: "txt" | "srt";
  include_timestamps?: boolean;
  include_speakers?: boolean;
}): Promise<string> {
  const format = args.format ?? "txt";
  const includeTimestamps = args.include_timestamps !== false;
  const includeSpeakers = args.include_speakers !== false;

  logger.debug("exportTranscript called", { file_id: args.file_id, format, includeTimestamps, includeSpeakers });

  const segments = await fetchTranscriptSegments(args.file_id);
  if (!segments) {
    return JSON.stringify({ error: "No transcript found for this file. Generate a transcript first." });
  }

  logger.info(`exportTranscript formatting ${segments.length} segments as ${format}`, { file_id: args.file_id });

  if (format === "srt") {
    const lines: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      lines.push(String(i + 1));
      lines.push(`${formatSrtTime(seg.start_time)} --> ${formatSrtTime(seg.end_time)}`);
      const prefix = includeSpeakers && seg.speaker ? `${seg.speaker}: ` : "";
      lines.push(`${prefix}${seg.content}`);
      lines.push("");
    }
    return lines.join("\n");
  }

  // TXT format
  const lines: string[] = [];
  for (const seg of segments) {
    const parts: string[] = [];
    if (includeTimestamps) parts.push(formatMs(seg.start_time));
    if (includeSpeakers && seg.speaker) parts.push(seg.speaker);
    if (parts.length > 0) {
      lines.push(parts.join("    "));
    }
    lines.push(seg.content);
    lines.push("");
  }
  return lines.join("\n");
}
