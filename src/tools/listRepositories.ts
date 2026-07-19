import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listRepositoriesSchema } from "../schemas/listRepositories.js";
import { listRepositories } from "../github/operations.js";

export function registerListRepositoriesTool(server: McpServer) {
  server.registerTool(
    "list_repositories",
    {
      title: "Listar repositorios",
      description:
        "Lista los repositorios del usuario autenticado en GitHub, opcionalmente filtrados por visibilidad (all, public o private).",
      inputSchema: listRepositoriesSchema,
    },
    async ({ visibility }) => {
      const repos = await listRepositories({ visibility });
      const text =
        repos.map((repo) => repo.full_name).join("\n") ||
        "No se encontraron repositorios.";
      return { content: [{ type: "text", text }] };
    }
  );
}
