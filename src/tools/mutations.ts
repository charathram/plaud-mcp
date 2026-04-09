import { plaudRequest } from "../client.js";
import { logger } from "../logger.js";
import { PlaudPatchResponseSchema, PlaudGenerateResponseSchema, PlaudFileDetailResponseSchema } from "../schemas.js";

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
  logger.info(`renameFile ${res.status === 0 ? "succeeded" : "failed"}`, { file_id: args.file_id });
  return JSON.stringify({ success: res.status === 0, message: res.msg });
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
      success: res.status === 0,
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
  return JSON.stringify({ success: res.status === 0, message: res.msg });
}

export async function trashFile(args: { file_id: string }): Promise<string> {
  logger.debug("trashFile called", { file_id: args.file_id });
  const res = await plaudRequest(
    "PATCH",
    `/file/${args.file_id}`,
    { is_deleted: 1 },
    PlaudPatchResponseSchema,
  );
  return JSON.stringify({ success: res.status === 0, message: res.msg });
}

export async function generate(args: {
  file_id: string;
  language?: string;
  speaker_labeling?: boolean;
  llm?: string;
  template_id?: string;
  template_type?: string;
}): Promise<string> {
  const language = args.language ?? "auto";
  const diarization = args.speaker_labeling !== false ? 1 : 0;
  const llm = args.llm ?? "auto";
  const summType = args.template_id ?? "AUTO-SELECT";
  const summTypeType = args.template_id ? (args.template_type ?? "community") : "system";

  logger.debug("generate called", { file_id: args.file_id, language, diarization, llm, summType });

  const body = {
    is_reload: 0,
    summ_type: summType,
    summ_type_type: summTypeType,
    info: JSON.stringify({ language, timezone: new Date().getTimezoneOffset() / -60, diarization, llm }),
    support_mul_summ: true,
  };

  const res = await plaudRequest(
    "POST",
    `/ai/transsumm/${args.file_id}`,
    body,
    PlaudGenerateResponseSchema,
  );

  logger.info(`generate ${res.status === 0 ? "started" : "failed"}`, { file_id: args.file_id });
  return JSON.stringify({ success: res.status === 0, message: res.msg });
}

interface TranscriptSegment {
  start_time: number;
  end_time: number;
  content: string;
  speaker: string;
  original_speaker: string;
  [key: string]: unknown;
}

export async function nameSpeakers(args: {
  file_id: string;
  renames: { old_name: string; new_name: string }[];
}): Promise<string> {
  logger.debug("nameSpeakers called", { file_id: args.file_id, renames: args.renames });

  // 1. Fetch file detail to get transcript content URL
  const detail = await plaudRequest(
    "GET",
    `/file/detail/${args.file_id}`,
    undefined,
    PlaudFileDetailResponseSchema,
  );

  // Find the polished transcript first, fall back to raw
  const polished = detail.data.content_list.find((c) => c.data_type === "transaction_polish");
  const raw = detail.data.content_list.find((c) => c.data_type === "transaction");
  const source = polished ?? raw;

  if (!source?.data_link) {
    return JSON.stringify({ error: "No transcript found for this file. Generate a transcript first." });
  }

  // 2. Fetch the transcript content from S3
  logger.debug("Fetching transcript from S3", { data_type: source.data_type });
  const transcriptRes = await fetch(source.data_link);
  if (!transcriptRes.ok) {
    throw new Error(`Failed to fetch transcript from S3: ${transcriptRes.status}`);
  }
  const segments: TranscriptSegment[] = await transcriptRes.json();

  // 3. Apply speaker renames
  const renameMap = new Map(args.renames.map((r) => [r.old_name.toLowerCase(), r.new_name]));
  let renamed = 0;
  for (const seg of segments) {
    const newName = renameMap.get(seg.speaker.toLowerCase());
    if (newName) {
      seg.speaker = newName;
      renamed++;
    }
  }

  if (renamed === 0) {
    const currentSpeakers = [...new Set(segments.map((s) => s.speaker))];
    return JSON.stringify({ error: "No matching speakers found", current_speakers: currentSpeakers });
  }

  logger.info(`nameSpeakers renaming ${renamed} segments`, { file_id: args.file_id });

  // 4. PATCH file with updated transcript
  const patchRes = await plaudRequest(
    "PATCH",
    `/file/${args.file_id}`,
    { trans_result: segments, support_mul_summ: true },
    PlaudPatchResponseSchema,
  );

  // 5. Update source transcript content
  await plaudRequest(
    "POST",
    "/ai/update_source_info",
    {
      file_id: args.file_id,
      source_type: source.data_type,
      source_id: source.data_id,
      source_content: JSON.stringify(segments),
    },
    PlaudPatchResponseSchema,
  );

  const updatedSpeakers = [...new Set(segments.map((s) => s.speaker))];
  return JSON.stringify({
    success: patchRes.status === 0,
    segments_updated: renamed,
    speakers: updatedSpeakers,
  });
}
