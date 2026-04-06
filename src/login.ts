import puppeteer from "puppeteer-core";
import { resolveEnvPath } from "./env.js";

const ENV_PATH = resolveEnvPath();

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
    "No supported browser found. Use --browser /path/to/browser or set CHROME_PATH env var.\n" +
    "Supported: Chrome, Chromium, Brave, Edge, Firefox, or any Chromium-based browser."
  );
}

function isFirefox(browserPath: string): boolean {
  return /firefox/i.test(browserPath);
}

async function main() {
  const args = process.argv.slice(2);
  const browserFlag = args.indexOf("--browser");
  const browserPath =
    (browserFlag !== -1 && args[browserFlag + 1]) ||
    process.env.CHROME_PATH ||
    findBrowser();
  console.log(`Using browser: ${browserPath}`);
  console.log("Opening Plaud login page...\n");

  const ff = isFirefox(browserPath);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    browser: ff ? "firefox" : "chrome",
    headless: false,
    args: ff ? [] : ["--no-first-run", "--no-default-browser-check"],
    defaultViewport: null,
  });

  const page = (await browser.pages())[0] ?? (await browser.newPage());

  console.log("Waiting for you to log in at web.plaud.ai...");

  const credentials = await new Promise<{
    authToken: string;
    deviceTag: string;
    userHash: string;
    deviceId: string;
  }>((resolve) => {
    page.on("request", (request) => {
      const url = request.url();
      if (!url.includes("api.plaud.ai")) return;

      const headers = request.headers();
      const authToken = (headers["authorization"] || "")
        .replace(/^bearer\s+/i, "");

      if (!authToken) return;

      resolve({
        authToken,
        deviceTag: headers["x-pld-tag"] || "",
        userHash: headers["x-pld-user"] || "",
        deviceId: headers["x-device-id"] || "",
      });
    });
  });

  console.log("\nCredentials captured!");

  const envContent = [
    `PLAUD_AUTH_TOKEN=${credentials.authToken}`,
    `PLAUD_DEVICE_TAG=${credentials.deviceTag}`,
    `PLAUD_USER_HASH=${credentials.userHash}`,
    `PLAUD_DEVICE_ID=${credentials.deviceId}`,
    "",
  ].join("\n");

  await Bun.write(ENV_PATH, envContent);
  console.log(`Saved to ${ENV_PATH}`);

  await browser.close();
  console.log("Done. You can now use the MCP server.");
}

export default main().catch((err) => {
  console.error("Login failed:", err.message);
  process.exit(1);
});
