import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createIssueSchema } from "../schemas/createIssue.js";
import { createIssue } from "../github/operations.js";
import { toToolErrorResult } from "../errors/index.js";

export function registerCreateIssueTool(server: McpServer) {
  server.registerTool(
    "create_issue",
    {
      title: "Crear issue",
      description:
        "Crea un nuevo issue en un repositorio de GitHub, con título, descripción opcional y labels opcionales.",
      inputSchema: createIssueSchema,
    },
    async ({ owner, repo, title, body, labels }) => {
      try {
        const issue = await createIssue({ owner, repo, title, body, labels });
        return {
          content: [
            {
              type: "text",
              text: `Issue #${issue.number} creado: ${issue.html_url}`,
            },
          ],
        };
      } catch (error) {
        return toToolErrorResult(error);
      }
    }
  );
}
