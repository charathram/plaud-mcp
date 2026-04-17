import { captureCredentials } from "../login.js";
import { writeCachedCredentials } from "../credentials.js";
import { plaudRequest, _resetConfigCache } from "../client.js";
import { PlaudUserResponseSchema } from "../schemas.js";
import { logger } from "../logger.js";

let loginInProgress = false;

export async function plaudLogin(args: { browser_path?: string }): Promise<string> {
  if (loginInProgress) {
    return "A plaud_login is already in progress. Finish the current sign-in (or close the browser to cancel) before starting another.";
  }

  loginInProgress = true;
  try {
    logger.info("plaud_login starting browser-based sign-in");

    const creds = await captureCredentials({
      browserPath: args.browser_path,
      onStatus: (msg) => logger.info(msg),
    });

    const cachePath = await writeCachedCredentials(creds);
    _resetConfigCache();
    logger.info("plaud_login credentials captured", { cachePath });

    // Confirm by fetching /user/me and returning the signed-in user's email/name.
    let whoami = "";
    try {
      const res = await plaudRequest("GET", "/user/me", undefined, PlaudUserResponseSchema);
      const user = res.data_user as Record<string, unknown>;
      const email = typeof user.email === "string" ? user.email : "";
      const name = typeof user.nickname === "string" ? user.nickname : "";
      whoami = email || name || "";
    } catch (err) {
      logger.warn("Could not confirm signed-in user via /user/me", { error: String(err) });
    }

    return whoami
      ? `Signed in as ${whoami}. Credentials saved. You can now use Plaud tools.`
      : "Signed in. Credentials saved. You can now use Plaud tools.";
  } finally {
    loginInProgress = false;
  }
}
