# mcp-github-agent

Servidor MCP (Model Context Protocol) en Node.js + TypeScript que expone tools para automatizar operaciones sobre GitHub, pensado para ser consumido por un Host (Antigravity) y un LLM cliente (Gemini).

## Arquitectura

```
Antigravity (HOST)
    ↓ gestiona la sesión y conecta los componentes
LLM — Gemini (CLIENT)
    ↓ lee la descripción de los tools, decide cuál invocar y con qué parámetros
MCP Server — este repo (SERVER)
    ↓ expone tools, valida inputs con Zod, ejecuta operaciones
GitHub API (vía Octokit)
    ↓ recibe llamadas autenticadas y devuelve resultados
```

La comunicación entre Antigravity y este servidor es vía **stdio** (JSON-RPC sobre `stdin`/`stdout`), no HTTP.

## Requisitos

- Node.js 18 o superior
- Una cuenta de GitHub con un [Personal Access Token](https://github.com/settings/tokens) con scopes `repo`, `user`, `admin:org`
- [Antigravity](https://antigravity.google/) instalado (Host que conecta el LLM con este servidor)

## Instalación

```bash
git clone <url-del-repo>
cd mcp-github-agent
npm install
```

## Configuración

1. Copiá `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Generá un Personal Access Token en GitHub (`Settings → Developer settings → Personal access tokens`) con los scopes `repo`, `user`, `admin:org`.
3. Pegá el token en `.env`:
   ```
   GITHUB_TOKEN=ghp_tu_token_aca
   ```

**El archivo `.env` nunca se commitea** (está en `.gitignore`).

Compilá el proyecto:

```bash
npm run build
```

## Configuración de Antigravity

Antigravity ejecuta este servidor como subproceso vía `command`/`args` en su archivo de configuración de MCP servers.

1. En Antigravity: `"..." (Additional Options) → MCP Servers → Manage MCP Servers → View raw config`. Esto abre `mcp_config.json` (en Windows: `C:\Users\<usuario>\.gemini\antigravity\mcp_config.json`).
2. Agregá una entrada apuntando al `dist/server.js` compilado, con **ruta absoluta**:

   ```json
   {
     "mcpServers": {
       "github-agent": {
         "command": "node",
         "args": ["<ruta-absoluta-al-repo>/dist/server.js"]
       }
     }
   }
   ```

3. Guardá el archivo. En el panel de MCP Servers de Antigravity, `github-agent` debería aparecer conectado.

> Importante: Antigravity ejecuta el `.js` ya compilado, no el `.ts` fuente. Corré `npm run build` después de cada cambio antes de probarlo en Antigravity.

## Scripts disponibles

| Script          | Qué hace                                                             |
| --------------- | --------------------------------------------------------------------- |
| `npm run build` | Compila TypeScript (`src/`) a JavaScript (`dist/`)                    |
| `npm run dev`   | Corre el servidor en modo desarrollo con recarga automática (`tsx`)   |
| `npm start`     | Corre el servidor ya compilado (`dist/server.js`)                     |
| `npm test`      | Corre la suite de tests con Vitest                                    |

## Tools disponibles

### `ping`

Tool trivial sin parámetros que responde `pong`. Sirve para verificar que el servidor está vivo y que el pipeline Antigravity → Gemini → MCP Server está funcionando de punta a punta.

**Ejemplo de prompt:** `"usá la tool ping para verificar la conexión"`

## Testing

```bash
npm test
```

Los tests **nunca** llaman a la API real de GitHub — Octokit se mockea con `vi.mock()`.

## Licencia

MIT
