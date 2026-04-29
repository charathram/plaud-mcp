#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listFiles, getFile, getMetadata, searchFiles, getUser } from "./tools/files.js";
import { getTranscript, getSummary, exportTranscript } from "./tools/content.js";
import { renameFile, batchRename, moveToFolder, trashFile, generate, nameSpeakers } from "./tools/mutations.js";
import { listFolders } from "./tools/folders.js";
import { logger, parseLogLevel, setLogLevel } from "./logger.js";
import pkg from "../package.json";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`plaud-mcp v${pkg.version} — MCP server for Plaud.ai

Usage:
  plaud-mcp              Start the MCP server (stdio transport)
  plaud-mcp --login      Open a browser to capture Plaud login credentials
  plaud-mcp --version    Print version and exit
  plaud-mcp --help       Show this help message

Options:
  --env <path>           Path to .env credentials file
  --browser <path>       Use a specific browser binary for login
  --log-level <level>    Set log verbosity: debug, info, warn, error (default: info)

Quick setup:
  claude mcp add plaud -- /path/to/plaud-mcp --env /path/to/.env

Or add to .mcp.json (project) or ~/.claude.json (global):

  {
    "mcpServers": {
      "plaud": {
        "command": "/path/to/plaud-mcp",
        "args": ["--env", "/path/to/.env"]
      }
    }
  }

Environment variables:
  PLAUD_ENV_FILE         Path to .env credentials file
  CHROME_PATH            Path to browser binary for login
  PLAUD_LOG_LEVEL        Log verbosity (debug, info, warn, error)`);
  process.exit(0);
}

if (process.argv.includes("--version")) {
  console.log(pkg.version);
  process.exit(0);
}

if (process.argv.includes("--login")) {
  const login = await import("./login.js");
  await login.default;
  process.exit(0);
}

setLogLevel(parseLogLevel());

const server = new McpServer(
  {
    name: "plaud",
    version: pkg.version,
  },
  {
    instructions: [
      "Plaud MCP server — access Plaud.ai audio recordings, transcripts, and summaries.",
      "",
      "Available tools:",
      "- plaud_list_files: List recordings, filter by transcription status or duration",
      "- plaud_get_file: Get file metadata, content links, and any pre-fetched summary payload (no raw transcript text — use plaud_get_transcript)",
      "- plaud_get_metadata: Fetch metadata only for one or more files by id (live + trashed)",
      "- plaud_search_files: Search recordings by keyword or date range",
      "- plaud_get_user: Get current user profile",
      "- plaud_get_transcript: Fetch raw or polished transcript text",
      "- plaud_get_summary: Fetch AI-generated summary",
      "- plaud_generate: Generate transcript and summary (auto or custom options)",
      "- plaud_rename_file: Rename a single file",
      "- plaud_batch_rename: Rename multiple files at once",
      "- plaud_move_to_folder: Move a file to a folder",
      "- plaud_list_folders: List all folders/tags",
      "- plaud_trash_file: Move a file to trash",
      "",
      "Typical workflow: list files → get transcript → get summary.",
      "Use plaud_generate to transcribe files that haven't been processed yet.",
    ].join("\n"),
  },
);

// File tools
server.tool(
  "plaud_list_files",
  "List Plaud audio recordings with metadata. Returns 20 files per page by default — use offset to paginate.",
  {
    filter: z.enum(["all", "untranscribed", "transcribed"]).optional().describe("Filter by transcription status"),
    min_duration_minutes: z.number().optional().describe("Minimum duration in minutes"),
    limit: z.number().optional().describe("Max files to return (default: 20)"),
    offset: z.number().optional().describe("Number of files to skip for pagination (default: 0)"),
  },
  async (args) => ({ content: [{ type: "text", text: await listFiles(args) }] })
);

server.tool(
  "plaud_get_file",
  "Get file metadata, content links, and any pre-fetched summary payload. Does not include raw transcript text — use plaud_get_transcript for that.",
  {
    file_id: z.string().describe("The file ID"),
  },
  async (args) => ({ content: [{ type: "text", text: await getFile(args) }] })
);

server.tool(
  "plaud_get_metadata",
  "Fetch metadata only for one or more files by id. Returns the full per-file metadata block (filename, size, durations, timestamps, status flags, tags, keywords) — no transcript, summary, content links, or embeddings. Resolves both live and trashed files. Returns { found, missing } so callers can distinguish unknown ids from existing ones.",
  {
    file_ids: z.array(z.string()).min(1).describe("One or more file IDs to look up"),
  },
  async (args) => ({ content: [{ type: "text", text: await getMetadata(args) }] })
);

server.tool(
  "plaud_search_files",
  "Search files by keyword or date range",
  {
    query: z.string().optional().describe("Search keyword for file name"),
    start_date: z.string().optional().describe("Start date (ISO format)"),
    end_date: z.string().optional().describe("End date (ISO format)"),
  },
  async (args) => ({ content: [{ type: "text", text: await searchFiles(args) }] })
);

server.tool(
  "plaud_get_user",
  "Get current Plaud user profile",
  {},
  async () => ({ content: [{ type: "text", text: await getUser() }] })
);

// Content tools
server.tool(
  "plaud_get_transcript",
  "Fetch transcript text for a file",
  {
    file_id: z.string().describe("The file ID"),
    type: z.enum(["raw", "polished"]).optional().describe("Transcript type: raw or polished (default: raw)"),
  },
  async (args) => ({ content: [{ type: "text", text: await getTranscript(args) }] })
);

server.tool(
  "plaud_get_summary",
  "Fetch AI summary for a file",
  {
    file_id: z.string().describe("The file ID"),
  },
  async (args) => ({ content: [{ type: "text", text: await getSummary(args) }] })
);

server.tool(
  "plaud_export_transcript",
  "Export a transcript as formatted text. Supports TXT and SRT formats with optional timestamps and speaker labels.",
  {
    file_id: z.string().describe("The file ID"),
    format: z.enum(["txt", "srt"]).optional().describe("Export format: txt or srt (default: txt)"),
    include_timestamps: z.boolean().optional().describe("Include timestamps (default: true)"),
    include_speakers: z.boolean().optional().describe("Include speaker labels (default: true)"),
  },
  async (args) => ({ content: [{ type: "text", text: await exportTranscript(args) }] })
);

// Mutation tools
server.tool(
  "plaud_rename_file",
  "Rename a single file",
  {
    file_id: z.string().describe("The file ID"),
    new_name: z.string().describe("New file name"),
  },
  async (args) => ({ content: [{ type: "text", text: await renameFile(args) }] })
);

server.tool(
  "plaud_batch_rename",
  "Rename multiple files at once",
  {
    renames: z.array(z.object({
      file_id: z.string().describe("The file ID"),
      new_name: z.string().describe("New file name"),
    })).describe("Array of {file_id, new_name} pairs"),
  },
  async (args) => ({ content: [{ type: "text", text: await batchRename(args) }] })
);

server.tool(
  "plaud_move_to_folder",
  "Move a file to a folder",
  {
    file_id: z.string().describe("The file ID"),
    folder_id: z.string().describe("The folder/tag ID"),
  },
  async (args) => ({ content: [{ type: "text", text: await moveToFolder(args) }] })
);

server.tool(
  "plaud_list_folders",
  "List all folders/tags",
  {},
  async () => ({ content: [{ type: "text", text: await listFolders() }] })
);

server.tool(
  "plaud_trash_file",
  "Move a file to trash",
  {
    file_id: z.string().describe("The file ID"),
  },
  async (args) => ({ content: [{ type: "text", text: await trashFile(args) }] })
);

server.tool(
  "plaud_generate",
  "Generate transcript and summary for a file. Defaults to auto mode which picks the best settings. Use optional parameters for custom generation.",
  {
    file_id: z.string().describe("The file ID"),
    language: z.string().optional().describe("Language code (e.g. 'en', 'zh', 'ja') or 'auto' for auto-detect (default: auto)"),
    speaker_labeling: z.boolean().optional().describe("Enable speaker diarization (default: true)"),
    llm: z.string().optional().describe("AI model to use, or 'auto' (default: auto)"),
    template_id: z.string().optional().describe("Summary template ID (omit for auto-select)"),
    template_type: z.string().optional().describe("Template type: 'system' or 'community' (default: system for auto, community for custom templates)"),
  },
  async (args) => ({ content: [{ type: "text", text: await generate(args) }] })
);

server.tool(
  "plaud_name_speakers",
  "Rename speakers in a transcript. Replaces all occurrences of a speaker name across all segments. Requires the file to have been transcribed first.",
  {
    file_id: z.string().describe("The file ID"),
    renames: z.array(z.object({
      old_name: z.string().describe("Current speaker name (e.g. 'Speaker 2')"),
      new_name: z.string().describe("New speaker name (e.g. 'Alice')"),
    })).describe("Array of {old_name, new_name} pairs to rename"),
  },
  async (args) => ({ content: [{ type: "text", text: await nameSpeakers(args) }] })
);

// Start server
async function main() {
  logger.info(`plaud-mcp v${pkg.version} starting`, { logLevel: parseLogLevel() });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP server connected via stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
