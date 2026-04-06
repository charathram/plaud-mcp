import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listFiles, getFile, searchFiles, getUser } from "./tools/files.js";
import { getTranscript, getSummary } from "./tools/content.js";
import { renameFile, batchRename, moveToFolder, trashFile } from "./tools/mutations.js";
import { listFolders } from "./tools/folders.js";
import pkg from "../package.json";

if (process.argv.includes("--version")) {
  console.log(pkg.version);
  process.exit(0);
}

const server = new McpServer({
  name: "plaud",
  version: pkg.version,
});

// File tools
server.tool(
  "plaud_list_files",
  "List all Plaud audio recordings with metadata",
  {
    filter: z.enum(["all", "untranscribed", "transcribed"]).optional().describe("Filter by transcription status"),
    min_duration_minutes: z.number().optional().describe("Minimum duration in minutes"),
  },
  async (args) => ({ content: [{ type: "text", text: await listFiles(args) }] })
);

server.tool(
  "plaud_get_file",
  "Get detailed info for a specific file including content links",
  {
    file_id: z.string().describe("The file ID"),
  },
  async (args) => ({ content: [{ type: "text", text: await getFile(args) }] })
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

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
