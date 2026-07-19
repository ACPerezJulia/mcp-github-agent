import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createBranchSchema } from "../schemas/createBranch.js";
import { createBranch } from "../github/operations.js";
import { toToolErrorResult } from "../errors/index.js";

export function registerCreateBranchTool(server: McpServer) {
  server.registerTool(
    "create_branch",
    {
      title: "Crear rama",
      description:
        "Crea una nueva rama en un repositorio de GitHub a partir de otra rama base (por defecto, la rama principal del repo).",
      inputSchema: createBranchSchema,
    },
    async ({ owner, repo, branchName, baseBranch }) => {
      try {
        const ref = await createBranch({ owner, repo, branchName, baseBranch });
        return {
          content: [{ type: "text", text: `Rama creada: ${ref.ref}` }],
        };
      } catch (error) {
        return toToolErrorResult(error);
      }
    }
  );
}
