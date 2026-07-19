import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRepositorySchema } from "../schemas/createRepository.js";
import { createRepository } from "../github/operations.js";

export function registerCreateRepositoryTool(server: McpServer) {
  server.registerTool(
    "create_repository",
    {
      title: "Crear repositorio",
      description:
        "Crea un nuevo repositorio de GitHub bajo el usuario autenticado, con nombre, descripción opcional y visibilidad (público o privado).",
      inputSchema: createRepositorySchema,
    },
    async ({ name, description, private: isPrivate }) => {
      const repo = await createRepository({
        name,
        description,
        private: isPrivate,
      });
      return {
        content: [
          { type: "text", text: `Repositorio creado: ${repo.html_url}` },
        ],
      };
    }
  );
}
