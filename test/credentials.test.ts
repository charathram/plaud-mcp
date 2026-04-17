import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { unlink } from "fs/promises";
import "./setup.js";
import { readCachedCredentials, writeCachedCredentials } from "../src/credentials.js";

describe("credentials cache", () => {
  const testPath = join(tmpdir(), `plaud-mcp-credtest-${process.pid}.json`);
  const originalPath = process.env.PLAUD_CREDENTIALS_FILE;

  beforeEach(() => {
    process.env.PLAUD_CREDENTIALS_FILE = testPath;
  });

  afterEach(async () => {
    process.env.PLAUD_CREDENTIALS_FILE = originalPath;
    await unlink(testPath).catch(() => {});
  });

  test("returns null when cache file does not exist", async () => {
    await unlink(testPath).catch(() => {});
    expect(await readCachedCredentials()).toBeNull();
  });

  test("writes and reads credentials roundtrip", async () => {
    const creds = {
      authToken: "jwt-abc",
      deviceTag: "tag-1",
      userHash: "user-2",
      deviceId: "dev-3",
    };
    const written = await writeCachedCredentials(creds);
    expect(written).toBe(testPath);

    const read = await readCachedCredentials();
    expect(read).toEqual(creds);
  });

  test("returns null for malformed JSON in cache file", async () => {
    await Bun.write(testPath, "{not json");
    expect(await readCachedCredentials()).toBeNull();
  });

  test("returns null when cache file lacks authToken", async () => {
    await Bun.write(testPath, JSON.stringify({ deviceTag: "x" }));
    expect(await readCachedCredentials()).toBeNull();
  });

  test("defaults missing optional fields to empty string", async () => {
    await Bun.write(testPath, JSON.stringify({ authToken: "only-token" }));
    const read = await readCachedCredentials();
    expect(read).toEqual({
      authToken: "only-token",
      deviceTag: "",
      userHash: "",
      deviceId: "",
    });
  });
});
