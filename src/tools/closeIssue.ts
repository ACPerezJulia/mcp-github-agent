import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { closeIssueSchema } from "../schemas/closeIssue.js";
import { closeIssue } from "../github/operations.js";
import { toToolErrorResult } from "../errors/index.js";

export function registerCloseIssueTool(server: McpServer) {
  server.registerTool(
    "close_issue",
    {
      title: "Cerrar issue",
      description: "Cierra un issue existente en un repositorio de GitHub.",
      inputSchema: closeIssueSchema,
    },
    async ({ owner, repo, issueNumber }) => {
      try {
        const issue = await closeIssue({ owner, repo, issueNumber });
        return {
          content: [
            {
              type: "text",
              text: `Issue #${issue.number} cerrado: ${issue.html_url}`,
            },
          ],
        };
      } catch (error) {
        return toToolErrorResult(error);
      }
    }
  );
}
