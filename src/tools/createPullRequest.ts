import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPullRequestSchema } from "../schemas/createPullRequest.js";
import { createPullRequest } from "../github/operations.js";
import { toToolErrorResult } from "../errors/index.js";

export function registerCreatePullRequestTool(server: McpServer) {
  server.registerTool(
    "create_pull_request",
    {
      title: "Crear pull request",
      description:
        "Crea un pull request en un repositorio de GitHub, desde una rama origen (head) hacia una rama destino (base).",
      inputSchema: createPullRequestSchema,
    },
    async ({ owner, repo, title, head, base, body }) => {
      try {
        const pr = await createPullRequest({
          owner,
          repo,
          title,
          head,
          base,
          body,
        });
        return {
          content: [
            {
              type: "text",
              text: `Pull request #${pr.number} creado: ${pr.html_url}`,
            },
          ],
        };
      } catch (error) {
        return toToolErrorResult(error);
      }
    }
  );
}
