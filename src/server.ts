import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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

const transport = new StdioServerTransport();
await server.connect(transport);
