export interface PlaudFile {
  id: string;
  filename: string;
  filesize: number;
  filetype: string;
  fullname: string;
  file_md5: string;
  ori_ready: boolean;
  version: number;
  version_ms: number;
  edit_time: number;
  edit_from: string;
  is_trash: boolean;
  start_time: number;
  end_time: number;
  duration: number;
  timezone: number;
  zonemins: number;
  scene: number;
  filetag_id_list: string[];
  serial_number: string;
  is_trans: boolean;
  is_summary: boolean;
  is_markmemo: boolean;
  wait_pull: number;
  keywords: string[];
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
