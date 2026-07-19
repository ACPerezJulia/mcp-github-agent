import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { EnvConfig } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env"), quiet: true });

const config: EnvConfig = {
  githubToken: process.env.GITHUB_TOKEN ?? "",
};

if (!config.githubToken) {
  throw new Error(
    "GITHUB_TOKEN no está definido. Revisá que exista un archivo .env con esa variable."
  );
}

export const octokit = new Octokit({ auth: config.githubToken });
