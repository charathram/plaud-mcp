import { z } from "zod";

// Zod schemas for Plaud API responses.
// These are the single source of truth for both runtime validation and TypeScript types.
// Use .passthrough() so unknown fields from the API are preserved, not stripped.
//
// Verified against real API responses on 2026-04-28.
// Run `bun run dump-api` to re-verify.

// Common response envelope: all endpoints return status + msg (except /user/me which omits msg)
// status=0 means success.

export const PlaudFileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  filesize: z.number(),
  filetype: z.string(),
  fullname: z.string(),
  file_md5: z.string(),
  ori_ready: z.boolean(),
  version: z.number(),
  version_ms: z.number(),
  edit_time: z.number(),
  edit_from: z.string(),
  is_trash: z.boolean(),
  start_time: z.number(),
  end_time: z.number(),
  duration: z.number(),
  timezone: z.number(),
  zonemins: z.number(),
  scene: z.number(),
  filetag_id_list: z.array(z.string()),
  serial_number: z.string(),
  is_trans: z.boolean(),
  is_summary: z.boolean(),
  is_markmemo: z.boolean(),
  wait_pull: z.number(),
  keywords: z.array(z.string()),
}).passthrough();

export type PlaudFile = z.infer<typeof PlaudFileSchema>;

export const PlaudFileListResponseSchema = z.object({
  status: z.number(),
  msg: z.string(),
  data_file_total: z.number(),
  data_file_list: z.array(PlaudFileSchema),
}).passthrough();

export type PlaudFileListResponse = z.infer<typeof PlaudFileListResponseSchema>;

export const PlaudContentItemSchema = z.object({
  data_id: z.string(),
  data_type: z.string(),
  task_status: z.number(),
  err_code: z.string(),
  err_msg: z.string(),
  data_title: z.string(),
  data_tab_name: z.string(),
  data_link: z.string(),
  // Per-item metadata varies by data_type:
  //   transaction / outline           → { task_id }
  //   transaction_polish              → { task_id, origin, error_code }
  //   auto_sum_note / sum_multi_note  → { summary_id, summ_type, summ_type_type, used_template }
  extra: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export type PlaudContentItem = z.infer<typeof PlaudContentItemSchema>;

export const PlaudUsedTemplateSchema = z.object({
  template_id: z.string(),
  template_type: z.string(),
  template_version_id: z.string(),
}).passthrough();

export type PlaudUsedTemplate = z.infer<typeof PlaudUsedTemplateSchema>;

export const PlaudRecommendQuestionSchema = z.object({
  category: z.string(),
  question: z.string(),
}).passthrough();

export type PlaudRecommendQuestion = z.infer<typeof PlaudRecommendQuestionSchema>;

export const PlaudAiContentHeaderSchema = z.object({
  category: z.string(),
  headline: z.string(),
  industry_category: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  language_code: z.string().optional(),
  original_category: z.string().optional(),
  recommend_questions: z.array(PlaudRecommendQuestionSchema).optional(),
  summary_id: z.string().optional(),
  used_template: PlaudUsedTemplateSchema.optional(),
}).passthrough();

export type PlaudAiContentHeader = z.infer<typeof PlaudAiContentHeaderSchema>;

export const PlaudTranConfigSchema = z.object({
  created_at: z.string(),
  diarization: z.number(),
  language: z.string(),
  llm: z.string(),
  type: z.string(),
  type_type: z.string(),
}).passthrough();

export type PlaudTranConfig = z.infer<typeof PlaudTranConfigSchema>;

export const PlaudTaskIdInfoSchema = z.object({
  outline_task_id: z.string().optional(),
  trans_task_id: z.string().optional(),
}).passthrough();

export type PlaudTaskIdInfo = z.infer<typeof PlaudTaskIdInfoSchema>;

export const PlaudExtraDataSchema = z.object({
  aiContentForm: z.record(z.string(), z.unknown()).optional(),
  aiContentHeader: PlaudAiContentHeaderSchema.optional(),
  has_replaced_speaker: z.boolean().optional(),
  last_trans_app_platform: z.string().optional(),
  last_trans_device_id: z.string().optional(),
  model: z.string().optional(),
  task_id_info: PlaudTaskIdInfoSchema.optional(),
  tranConfig: PlaudTranConfigSchema.optional(),
  used_template: PlaudUsedTemplateSchema.optional(),
}).passthrough();

export type PlaudExtraData = z.infer<typeof PlaudExtraDataSchema>;

// data_content is a JSON-encoded string (the parsed summary payload), not a parsed object.
export const PlaudPreDownloadContentSchema = z.object({
  data_id: z.string(),
  data_content: z.string(),
}).passthrough();

export type PlaudPreDownloadContent = z.infer<typeof PlaudPreDownloadContentSchema>;

// File detail endpoint returns a different shape than the list endpoint.
// The detail object uses file_id/file_name and has content_list.
export const PlaudFileDetailDataSchema = z.object({
  file_id: z.string(),
  file_name: z.string(),
  file_version: z.number(),
  duration: z.number(),
  is_trash: z.boolean(),
  start_time: z.number(),
  scene: z.number(),
  serial_number: z.string(),
  session_id: z.number(),
  wait_pull: z.number(),
  filetag_id_list: z.array(z.string()),
  content_list: z.array(PlaudContentItemSchema),
  has_thought_partner: z.boolean(),
  // Speaker voice fingerprints — keys are speaker labels ("Speaker 1", ...), values are 256-dim float arrays.
  embeddings: z.record(z.string(), z.array(z.number())).optional(),
  // Maps internal storage paths (e.g. summary poster images) to pre-signed S3 URLs.
  download_path_mapping: z.record(z.string(), z.string()).optional(),
  // Pre-fetched summary content keyed by data_id, saving a follow-up S3 round trip.
  pre_download_content_list: z.array(PlaudPreDownloadContentSchema).optional(),
  // Aggregated AI summary metadata: template, model, language, headline, keywords, recommended questions.
  extra_data: PlaudExtraDataSchema.optional(),
}).passthrough();

export type PlaudFileDetailData = z.infer<typeof PlaudFileDetailDataSchema>;

export const PlaudFileDetailResponseSchema = z.object({
  status: z.number(),
  msg: z.string(),
  data: PlaudFileDetailDataSchema,
}).passthrough();

export type PlaudFileDetailResponse = z.infer<typeof PlaudFileDetailResponseSchema>;

export const PlaudFolderSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
}).passthrough();

export type PlaudFolder = z.infer<typeof PlaudFolderSchema>;

export const PlaudFolderListResponseSchema = z.object({
  status: z.number(),
  msg: z.string(),
  data_filetag_total: z.number(),
  data_filetag_list: z.array(PlaudFolderSchema),
}).passthrough();

export type PlaudFolderListResponse = z.infer<typeof PlaudFolderListResponseSchema>;

export const PlaudUserResponseSchema = z.object({
  status: z.number(),
  data_user: z.record(z.string(), z.unknown()),
}).passthrough();

export type PlaudUserResponse = z.infer<typeof PlaudUserResponseSchema>;

export const PlaudPatchResponseSchema = z.object({
  status: z.number(),
  msg: z.string(),
}).passthrough();

export type PlaudPatchResponse = z.infer<typeof PlaudPatchResponseSchema>;

export const PlaudGenerateResponseSchema = z.object({
  status: z.number(),
  msg: z.string(),
}).passthrough();

export type PlaudGenerateResponse = z.infer<typeof PlaudGenerateResponseSchema>;
