import { resolve } from "path";

/**
 * Resolve the .env file path from (in priority order):
 * 1. Explicit path passed as argument (--output for login, --env for server)
 * 2. PLAUD_ENV_FILE environment variable
 * 3. .env in the current working directory
 */
export function resolveEnvPath(flagName = "--env"): string {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf(flagName);

  if (flagIndex !== -1 && args[flagIndex + 1]) {
    return resolve(args[flagIndex + 1]);
  }

  if (process.env.PLAUD_ENV_FILE) {
    return resolve(process.env.PLAUD_ENV_FILE);
  }

  return resolve(process.cwd(), ".env");
}
