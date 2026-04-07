# plaud-mcp

An MCP (Model Context Protocol) server for the [Plaud](https://web.plaud.ai) audio recording platform. Exposes Plaud's API as MCP tools, allowing AI assistants like Claude to list recordings, fetch transcripts and summaries, rename files, manage folders, and more.

Built with [Bun](https://bun.sh) + TypeScript. Compiles to a single native binary for Linux, macOS, and Windows.

## Features

- **11 MCP tools** covering the full Plaud API surface
- **Browser-based login** — no manual token extraction needed
- **Cross-platform binaries** — single-file executables, no runtime dependencies
- **Stdio transport** — works with any MCP-compatible client

### Available Tools

| Tool | Description |
|------|-------------|
| `plaud_list_files` | List all recordings, optionally filtered by transcription status or minimum duration |
| `plaud_get_file` | Get detailed metadata for a specific file |
| `plaud_search_files` | Search recordings by keyword or date range |
| `plaud_get_transcript` | Fetch raw or polished transcript text |
| `plaud_get_summary` | Fetch AI-generated summary |
| `plaud_rename_file` | Rename a single file |
| `plaud_batch_rename` | Rename multiple files at once (rate-limited) |
| `plaud_move_to_folder` | Move a file to a folder |
| `plaud_list_folders` | List all folders/tags |
| `plaud_trash_file` | Move a file to trash |
| `plaud_get_user` | Get current user profile |

---

## Usage

### Prerequisites

- A supported browser for the login flow: Chrome, Chromium, Brave, Edge, Firefox, or any Chromium-based browser. Safari is not supported.
- Pre-built binary for your platform (see [Releases](../../releases)), **or** [Bun](https://bun.sh) v1.3+ if building from source

### 1. Download the binary

Download the binary for your platform from the latest release:

| Directory | Platform |
|-----------|----------|
| `linux-x64/plaud-mcp` | Linux x86_64 |
| `linux-arm64/plaud-mcp` | Linux ARM64 |
| `darwin-x64/plaud-mcp` | macOS Intel |
| `darwin-arm64/plaud-mcp` | macOS Apple Silicon |
| `windows-x64/plaud-mcp.exe` | Windows x86_64 |

Make the binary executable (Linux/macOS):

```bash
chmod +x plaud-mcp
```

**macOS users:** If you see a "damaged and can't be opened" error, remove the quarantine attribute:

```bash
xattr -d com.apple.quarantine plaud-mcp
```

### 2. Login

Run the login command using the binary:

```bash
./plaud-mcp --login
```

To save credentials to a custom location:

```bash
./plaud-mcp --login --env /path/to/custom/.env
```

This opens your browser to web.plaud.ai. Log in normally — auth credentials are captured automatically and saved to `.env` (or the path specified with `--env`). The following values are stored:

- `PLAUD_AUTH_TOKEN` — JWT bearer token
- `PLAUD_DEVICE_TAG` — device tag header
- `PLAUD_USER_HASH` — user hash header
- `PLAUD_DEVICE_ID` — device ID header

Chrome, Chromium, Brave, Edge, and Firefox are auto-detected on Linux, macOS, and Windows. For other browsers, specify the binary with `--browser`:

```bash
./plaud-mcp --login --browser /usr/bin/brave-browser
```

Alternatively, if building from source:

```bash
bun install
bun run login
```

Or via the `CHROME_PATH` environment variable:

```bash
CHROME_PATH=/usr/bin/brave-browser bun run login
```

### 3. Run the server

The server looks for credentials in this order:

1. `--env /path/to/.env` flag
2. `PLAUD_ENV_FILE` environment variable
3. `.env` in the current working directory

```bash
# Uses .env in current directory
./plaud-mcp

# Or specify a custom path
./plaud-mcp --env /path/to/.env
```

### 4. Configure Claude Code

The quickest way to register the server:

```bash
claude mcp add plaud -- /path/to/plaud-mcp --env /path/to/.env
```

Or manually add to `.mcp.json` in your project root (shared with team):

```json
{
  "mcpServers": {
    "plaud": {
      "command": "/path/to/plaud-mcp",
      "args": ["--env", "/path/to/.env"]
    }
  }
}
```

Or add to `~/.claude.json` for personal access across all projects:

```json
{
  "mcpServers": {
    "plaud": {
      "command": "/path/to/plaud-mcp",
      "args": ["--env", "/path/to/.env"]
    }
  }
}
```

Restart Claude Code for the MCP server to connect.

### CLI Options

| Flag | Description | Applies to |
|------|-------------|------------|
| `--env <path>` | Path to `.env` credentials file | login, server |
| `--browser <path>` | Path to Chromium-based browser binary | login |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAUD_ENV_FILE` | Path to `.env` file with credentials (overridden by `--env`) | `.env` in current directory |
| `CHROME_PATH` | Path to browser binary (overridden by `--browser`) | Auto-detected |

---

## Development

### Setup

```bash
bun install
```

### Run the server

```bash
bun run start
```

### Configure Claude Code (dev mode)

```json
{
  "mcpServers": {
    "plaud": {
      "command": "bun",
      "args": ["run", "/path/to/plaud-mcp/src/index.ts"],
      "env": {
        "PLAUD_ENV_FILE": "/path/to/plaud-mcp/.env"
      }
    }
  }
}
```

### Run tests

```bash
bun test
```

Tests mock all HTTP requests and cover the API client, every tool handler, and MCP server integration.

### Build binaries

```bash
bash build.sh
```

Produces cross-platform binaries in `dist/`.

### Releasing

Bump the version, push the tag, and CI handles the rest:

```bash
npm version patch    # or minor/major — bumps package.json and creates a v* git tag
git push --follow-tags
```

This triggers the CI pipeline which runs tests, builds all 5 platform binaries, and creates a GitHub release with auto-generated release notes and the binaries attached.

### Project Structure

```
src/
├── index.ts              # MCP server entry point, tool registration
├── client.ts             # Plaud API HTTP client with auth
├── env.ts                # Shared .env path resolution (--env, PLAUD_ENV_FILE, cwd)
├── login.ts              # Browser-based login flow (puppeteer-core)
├── types.ts              # TypeScript interfaces for API responses
└── tools/
    ├── files.ts          # list_files, get_file, search_files, get_user
    ├── content.ts        # get_transcript, get_summary
    ├── mutations.ts      # rename, batch_rename, move_to_folder, trash
    └── folders.ts        # list_folders
test/
├── setup.ts              # Test helpers and fetch mocks
├── client.test.ts
├── files.test.ts
├── content.test.ts
├── mutations.test.ts
├── folders.test.ts
└── server.test.ts
```

## License

[MIT](LICENSE) — Charathram Ranganathan
