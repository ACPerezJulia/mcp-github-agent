import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listIssuesSchema } from "../schemas/listIssues.js";
import { listIssues } from "../github/operations.js";
import { toToolErrorResult } from "../errors/index.js";

export function registerListIssuesTool(server: McpServer) {
  server.registerTool(
    "list_issues",
    {
      title: "Listar issues",
      description:
        "Lista los issues de un repositorio de GitHub, filtrados por estado (open, closed o all) y opcionalmente por labels.",
      inputSchema: listIssuesSchema,
    },
    async ({ owner, repo, state, labels }) => {
      try {
        const issues = await listIssues({ owner, repo, state, labels });
        const text =
          issues
            .map((issue) => `#${issue.number} [${issue.state}] ${issue.title}`)
            .join("\n") || "No se encontraron issues.";
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return toToolErrorResult(error);
      }
    }
  );
}
