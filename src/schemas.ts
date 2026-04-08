import { z } from "zod";

// Zod schemas for Plaud API responses.
// These are the single source of truth for both runtime validation and TypeScript types.
// Use .passthrough() so unknown fields from the API are preserved, not stripped.

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
  code: z.number(),
  message: z.string(),
  data_file_list: z.array(PlaudFileSchema),
}).passthrough();

export type PlaudFileListResponse = z.infer<typeof PlaudFileListResponseSchema>;

export const PlaudContentItemSchema = z.object({
  type: z.string(),
  url: z.string(),
}).passthrough();

export type PlaudContentItem = z.infer<typeof PlaudContentItemSchema>;

export const PlaudFileDetailSchema = PlaudFileSchema.extend({
  content_list: z.array(PlaudContentItemSchema),
}).passthrough();

export type PlaudFileDetail = z.infer<typeof PlaudFileDetailSchema>;

export const PlaudFileDetailResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data_file: PlaudFileDetailSchema,
}).passthrough();

export type PlaudFileDetailResponse = z.infer<typeof PlaudFileDetailResponseSchema>;

export const PlaudFolderSchema = z.object({
  id: z.string(),
  tag_name: z.string(),
}).passthrough();

export type PlaudFolder = z.infer<typeof PlaudFolderSchema>;

export const PlaudFolderListResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data_tag_list: z.array(PlaudFolderSchema),
}).passthrough();

export type PlaudFolderListResponse = z.infer<typeof PlaudFolderListResponseSchema>;

export const PlaudUserResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data_user: z.record(z.string(), z.unknown()),
}).passthrough();

export type PlaudUserResponse = z.infer<typeof PlaudUserResponseSchema>;

export const PlaudPatchResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
}).passthrough();

export type PlaudPatchResponse = z.infer<typeof PlaudPatchResponseSchema>;
