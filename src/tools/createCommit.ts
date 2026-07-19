import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createCommitSchema } from "../schemas/createCommit.js";
import { createCommit } from "../github/operations.js";
import { toToolErrorResult } from "../errors/index.js";

export function registerCreateCommitTool(server: McpServer) {
  server.registerTool(
    "create_commit",
    {
      title: "Crear commit",
      description:
        "Crea o actualiza un archivo en un repositorio de GitHub mediante un commit directo sobre una rama.",
      inputSchema: createCommitSchema,
    },
    async ({ owner, repo, path, content, message, branch, sha }) => {
      try {
        const result = await createCommit({
          owner,
          repo,
          path,
          content,
          message,
          branch,
          sha,
        });
        return {
          content: [
            {
              type: "text",
              text: `Commit creado: ${result.commit.html_url}`,
            },
          ],
        };
      } catch (error) {
        return toToolErrorResult(error);
      }
    }
  );
}
