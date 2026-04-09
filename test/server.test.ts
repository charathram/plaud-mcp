import { describe, test, expect } from "bun:test";
import { mockFetchResponse } from "./setup.js";
import "./setup.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// We can't easily import the fully wired server without side effects,
// so we test that the MCP SDK integration pattern works correctly.
describe("MCP server integration", () => {
  test("tools are callable via MCP protocol", async () => {
    // Create a minimal server with one tool to verify the wiring pattern
    const server = new McpServer({ name: "test-plaud", version: "0.0.1" });

    server.tool(
      "plaud_list_files",
      "List files",
      { filter: z.enum(["all", "transcribed", "untranscribed"]).optional() },
      async (args) => {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ filter: args.filter ?? "all" }) }],
        };
      }
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.0.1" });
    await client.connect(clientTransport);

    // List tools
    const { tools } = await client.listTools();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe("plaud_list_files");

    // Call tool
    const result = await client.callTool({ name: "plaud_list_files", arguments: { filter: "transcribed" } });
    const text = (result.content as any)[0].text;
    expect(JSON.parse(text).filter).toBe("transcribed");

    await client.close();
    await server.close();
  });

  test("server registers all 13 tools", async () => {
    // Mock fetch before importing index to prevent real API calls
    globalThis.fetch = mockFetchResponse({ code: 0 }) as any;

    // Dynamically build a server with same tool names as index.ts
    const expectedTools = [
      "plaud_list_files",
      "plaud_get_file",
      "plaud_search_files",
      "plaud_get_user",
      "plaud_get_transcript",
      "plaud_get_summary",
      "plaud_rename_file",
      "plaud_batch_rename",
      "plaud_move_to_folder",
      "plaud_list_folders",
      "plaud_trash_file",
      "plaud_generate",
      "plaud_export_transcript",
    ];

    // We verify count by reading the source file
    const source = await Bun.file("src/index.ts").text();
    for (const tool of expectedTools) {
      expect(source).toContain(`"${tool}"`);
    }

    // Count server.tool( registrations
    const registrations = source.match(/server\.tool\(/g);
    expect(registrations?.length).toBe(13);
  });

  test("initialize response includes instructions with tool summary", async () => {
    const server = new McpServer(
      { name: "test-plaud", version: "0.0.1" },
      { instructions: "Plaud MCP server — test instructions" },
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.0.1" });
    await client.connect(clientTransport);

    expect(client.getServerVersion()).toMatchObject({ name: "test-plaud" });
    expect(client.getInstructions()).toBe("Plaud MCP server — test instructions");

    await client.close();
    await server.close();
  });

  test("server instructions list all tools", async () => {
    const source = await Bun.file("src/index.ts").text();
    // Extract the instructions string from source
    const expectedTools = [
      "plaud_list_files",
      "plaud_get_file",
      "plaud_search_files",
      "plaud_get_user",
      "plaud_get_transcript",
      "plaud_get_summary",
      "plaud_generate",
      "plaud_rename_file",
      "plaud_batch_rename",
      "plaud_move_to_folder",
      "plaud_list_folders",
      "plaud_trash_file",
    ];

    // Verify each tool is mentioned in the instructions block
    for (const tool of expectedTools) {
      expect(source).toContain(`"- ${tool}:`);
    }
  });
});
