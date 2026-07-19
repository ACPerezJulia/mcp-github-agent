import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListRepositoriesTool } from "./tools/listRepositories.js";
import { registerCreateRepositoryTool } from "./tools/createRepository.js";
import { registerCreateIssueTool } from "./tools/createIssue.js";
import { registerListIssuesTool } from "./tools/listIssues.js";
import { registerCreateCommitTool } from "./tools/createCommit.js";

const server = new McpServer({
  name: "mcp-github-agent",
  version: "1.0.0",
});

server.registerTool(
  "ping",
  {
    title: "Ping",
    description:
      "Tool trivial que responde 'pong'. Se usa para verificar que el servidor MCP está vivo y respondiendo correctamente.",
  },
  async () => {
    return {
      content: [{ type: "text", text: "pong" }],
    };
  }
);

registerListRepositoriesTool(server);
registerCreateRepositoryTool(server);
registerCreateIssueTool(server);
registerListIssuesTool(server);
registerCreateCommitTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
