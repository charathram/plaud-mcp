export interface PlaudFile {
  id: string;
  file_name: string;
  duration: number;
  created_at: string;
  updated_at: string;
  file_tag_id?: string;
  file_status?: number;
  ai_status?: number;
  trans_status?: number;
  [key: string]: unknown;
}

export interface PlaudFileListResponse {
  code: number;
  message: string;
  data_file_list: PlaudFile[];
}

export interface PlaudContentItem {
  type: string;
  url: string;
  [key: string]: unknown;
}

export interface PlaudFileDetail extends PlaudFile {
  content_list: PlaudContentItem[];
}

export interface PlaudFileDetailResponse {
  code: number;
  message: string;
  data_file: PlaudFileDetail;
}

export interface PlaudFolder {
  id: string;
  tag_name: string;
  [key: string]: unknown;
}

export interface PlaudFolderListResponse {
  code: number;
  message: string;
  data_tag_list: PlaudFolder[];
}

export interface PlaudUserResponse {
  code: number;
  message: string;
  data_user: Record<string, unknown>;
}

export interface PlaudPatchResponse {
  code: number;
  message: string;
  [key: string]: unknown;
}
