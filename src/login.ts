import { resolveEnvPath } from "./env.js";
import type { PlaudCredentials } from "./credentials.js";

function getBrowserPaths(): string[] {
  const paths = [
    // Chrome
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // Chromium
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    // Brave
    "/usr/bin/brave-browser",
    "/usr/bin/brave-browser-stable",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // Edge
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    // Firefox
    "/usr/bin/firefox",
    "/usr/bin/firefox-esr",
    "/snap/bin/firefox",
    "/Applications/Firefox.app/Contents/MacOS/firefox",
  ];

  if (process.platform === "win32") {
    const pf = process.env.PROGRAMFILES ?? "C:\\Program Files";
    const pf86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA ?? "";

    paths.push(
      // Chrome
      `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
      `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
      // Brave
      `${pf}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${pf86}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${localAppData}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      // Edge
      `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`,
      // Firefox
      `${pf}\\Mozilla Firefox\\firefox.exe`,
      `${pf86}\\Mozilla Firefox\\firefox.exe`,
    );
  }

  return paths;
}

function findBrowser(): string {
  for (const p of getBrowserPaths()) {
    if (Bun.file(p).size) return p;
  }
  throw new Error(
    "No Chromium-based browser found. Install Chrome from https://www.google.com/chrome/ " +
    "(or Brave, Edge, Firefox, Chromium) and try again. You can also pass a specific browser path."
  );
}

function isFirefox(browserPath: string): boolean {
  return /firefox/i.test(browserPath);
}

export interface CaptureOptions {
  browserPath?: string;
  timeoutMs?: number;
  onStatus?: (msg: string) => void;
}

/**
 * Launches a browser to web.plaud.ai and intercepts the first authenticated
 * request to api.plaud.ai to capture the 4 credential values.
 */
export async function captureCredentials(
  opts: CaptureOptions = {},
): Promise<PlaudCredentials> {
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
  const log = opts.onStatus ?? (() => {});

  const browserPath = opts.browserPath
    || process.env.CHROME_PATH
    || findBrowser();
  log(`Using browser: ${browserPath}`);

  // Lazy-load puppeteer so the MCP server can start up without importing it.
  // puppeteer-core has heavy top-level side-effects that break the compiled
  // binary's startup when imported unconditionally.
  const { default: puppeteer } = await import("puppeteer-core");

  const ff = isFirefox(browserPath);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    browser: ff ? "firefox" : "chrome",
    headless: false,
    args: ff ? [] : ["--no-first-run", "--no-default-browser-check"],
    defaultViewport: null,
  });

  try {
    const page = (await browser.pages())[0] ?? (await browser.newPage());
    await page.goto("https://web.plaud.ai");
    log("Waiting for you to sign in at web.plaud.ai…");

    return await new Promise<PlaudCredentials>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Login timed out after ${Math.round(timeoutMs / 60000)} minutes.`));
      }, timeoutMs);

      browser.on("disconnected", () => {
        clearTimeout(timer);
        reject(new Error("Browser closed before sign-in completed. Call plaud_login again when ready."));
      });

      // Wait for 200 responses from dashboard endpoints only. These are fired
      // AFTER the user has fully signed in and the app has navigated to the
      // authenticated view. Pre-auth or login-exchange responses (e.g. the
      // login POST itself) can return 200 with Authorization headers that are
      // short-lived or guest tokens and will 401 on real use.
      const DASHBOARD_ENDPOINTS = [
        "/user/me",
        "/file/simple/web",
        "/file/detail",
        "/filetag",
      ];
      const SETTLE_MS = 2000;
      let latest: PlaudCredentials | null = null;
      let settleTimer: ReturnType<typeof setTimeout> | null = null;

      page.on("response", async (response) => {
        const url = response.url();
        if (!url.includes("api.plaud.ai")) return;
        if (response.status() !== 200) return;
        if (!DASHBOARD_ENDPOINTS.some((ep) => url.includes(ep))) return;

        const request = response.request();
        const headers = request.headers();
        const authToken = (headers["authorization"] || "").replace(/^bearer\s+/i, "");
        const deviceTag = headers["x-pld-tag"] || "";
        const userHash = headers["x-pld-user"] || "";
        const deviceId = headers["x-device-id"] || "";

        if (!authToken || !deviceTag || !userHash || !deviceId) return;

        latest = { authToken, deviceTag, userHash, deviceId };
        log(`Captured dashboard credentials from ${new URL(url).pathname}, awaiting settle…`);

        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          clearTimeout(timer);
          resolve(latest!);
        }, SETTLE_MS);
      });
    });
  } finally {
    await browser.close().catch(() => {});
  }
}

/** CLI entry: captures credentials and writes them to .env. */
async function main() {
  const args = process.argv.slice(2);
  const browserFlag = args.indexOf("--browser");
  const browserPath = browserFlag !== -1 ? args[browserFlag + 1] : undefined;

  console.log("Opening Plaud login page...\n");
  const creds = await captureCredentials({
    browserPath,
    onStatus: (msg) => console.log(msg),
  });
  console.log("\nCredentials captured!");

  const envPath = resolveEnvPath();
  const envContent = [
    `PLAUD_AUTH_TOKEN=${creds.authToken}`,
    `PLAUD_DEVICE_TAG=${creds.deviceTag}`,
    `PLAUD_USER_HASH=${creds.userHash}`,
    `PLAUD_DEVICE_ID=${creds.deviceId}`,
    "",
  ].join("\n");
  await Bun.write(envPath, envContent);
  console.log(`Saved to ${envPath}`);
  console.log("Done. You can now use the MCP server.");
}

export default main;
