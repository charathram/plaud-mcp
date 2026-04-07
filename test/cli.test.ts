import { describe, test, expect } from "bun:test";

describe("CLI flags", () => {
  test("--help prints usage and MCP config", async () => {
    const result = Bun.spawnSync(["bun", "src/index.ts", "--help"]);
    const output = result.stdout.toString();

    expect(result.exitCode).toBe(0);
    expect(output).toContain("plaud-mcp v");
    expect(output).toContain("--login");
    expect(output).toContain("--version");
    expect(output).toContain("--help");
    expect(output).toContain("--env");
    expect(output).toContain("--browser");
    expect(output).toContain("claude mcp add");
    expect(output).toContain(".mcp.json");
    expect(output).toContain("mcpServers");
    expect(output).toContain("PLAUD_ENV_FILE");
    expect(output).toContain("CHROME_PATH");
  });

  test("-h prints the same as --help", async () => {
    const help = Bun.spawnSync(["bun", "src/index.ts", "--help"]);
    const h = Bun.spawnSync(["bun", "src/index.ts", "-h"]);

    expect(h.exitCode).toBe(0);
    expect(h.stdout.toString()).toBe(help.stdout.toString());
  });

  test("--version prints version", async () => {
    const result = Bun.spawnSync(["bun", "src/index.ts", "--version"]);
    const output = result.stdout.toString().trim();
    const pkg = await Bun.file("package.json").json();

    expect(result.exitCode).toBe(0);
    expect(output).toBe(pkg.version);
  });
});
