# mcp-github-agent

Servidor MCP (Model Context Protocol) en Node.js + TypeScript que expone tools para automatizar operaciones sobre GitHub, pensado para ser consumido por un Host (Antigravity) y un LLM cliente (Gemini).

## Casos de uso

- Listar y crear repositorios sin salir del chat con el asistente
- Crear y consultar issues de un proyecto usando lenguaje natural
- Commitear archivos (crear o actualizar) directamente sobre una rama
- Automatizar tareas repetitivas de gestión de GitHub (triage de issues, alta de repos nuevos, etc.) delegándolas a un LLM que decide qué operación ejecutar según el pedido del usuario

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

### Estructura del código

```
src/
  server.ts       → entry point: crea el McpServer, registra tools, conecta stdio
  types.ts        → tipos compartidos
  schemas/        → un schema de Zod por tool (valida input + documenta para el LLM)
  github/
    client.ts     → instancia de Octokit configurada con el token (separado para poder mockear)
    operations.ts → una función por operación de GitHub, con retry + traducción de errores
  errors/         → tipos de error custom y transformación a lenguaje natural
  utils/
    logging.ts    → logging a stderr (nunca a stdout, nunca datos sensibles)
    retry.ts      → backoff exponencial para rate limiting
  tools/          → un archivo por tool: registra el tool en el server y arma su handler
tests/            → tests con Vitest, Octokit siempre mockeado
```

## Requisitos

- Node.js 18 o superior
- Una cuenta de GitHub con un [Personal Access Token](https://github.com/settings/tokens)
- [Antigravity](https://antigravity.google/) instalado (Host que conecta el LLM con este servidor)

## Instalación

```bash
git clone <url-del-repo>
cd mcp-github-agent
npm install
```

## Configuración

### 1. Generar el Personal Access Token (PAT)

1. Andá a GitHub → `Settings → Developer settings → Personal access tokens → Tokens (classic)` → `Generate new token`.
2. Marcá los siguientes scopes:
   - **`repo`**: necesario para `list_repositories`, `create_repository`, `create_issue`, `list_issues` y `create_commit` (leer y escribir repositorios, issues y contenido de archivos).
   - **`user`**: necesario para operar como el usuario autenticado (por ejemplo, `create_repository` lo crea bajo tu usuario).
   - **`admin:org`**: no lo usa ninguno de los tools actuales del MVP — se deja documentado porque el enunciado original lo pedía para posibles operaciones a nivel organización, pero si vas a usar este token solo con los tools de este repo, no es estrictamente necesario.
3. Copiá el token generado (no lo vas a poder ver de nuevo).

### 2. Configurar el `.env`

```bash
cp .env.example .env
```

Pegá el token en `.env`:

```
GITHUB_TOKEN=ghp_tu_token_aca
```

**El archivo `.env` nunca se commitea** (está en `.gitignore`).

### 3. Compilar

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

3. Guardá el archivo. En el panel de MCP Servers de Antigravity, `github-agent` debería aparecer conectado, exponiendo 6 tools.

> Importante: Antigravity ejecuta el `.js` ya compilado, no el `.ts` fuente. Corré `npm run build` después de cada cambio, y **reconectá el servidor** desde el panel de MCP Servers de Antigravity para que tome el código nuevo (el proceso viejo sigue corriendo con el código anterior hasta que lo reiniciás).

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

### `list_repositories`

Lista los repositorios del usuario autenticado.

| Parámetro    | Tipo   | Obligatorio | Descripción                                              |
| ------------ | ------ | :---------: | --------------------------------------------------------- |
| `visibility` | enum   | No (default `all`) | `all`, `public` o `private`                        |

**Ejemplo de prompt:** `"listame mis repositorios privados de GitHub"`

### `create_repository`

Crea un nuevo repositorio bajo el usuario autenticado.

| Parámetro     | Tipo    | Obligatorio | Descripción                                                        |
| ------------- | ------- | :---------: | ------------------------------------------------------------------- |
| `name`        | string  | Sí          | 1-100 caracteres, solo letras/números/`.`/`-`/`_`, no puede terminar en `.git` ni `.wiki` |
| `description` | string  | No          | Descripción breve del repositorio                                  |
| `private`     | boolean | No (default `false`) | Si es `true`, el repo se crea privado                    |

**Ejemplo de prompt:** `"creá un repositorio privado llamado 'mi-proyecto' con la descripción 'proyecto de prueba'"`

### `create_issue`

Crea un issue en un repositorio existente.

| Parámetro | Tipo     | Obligatorio | Descripción                                    |
| --------- | -------- | :---------: | ------------------------------------------------ |
| `owner`   | string   | Sí          | Usuario u organización dueño del repo            |
| `repo`    | string   | Sí          | Nombre del repositorio                           |
| `title`   | string   | Sí          | Título del issue (máx. 256 caracteres)           |
| `body`    | string   | No          | Descripción en Markdown (máx. 65536 caracteres)  |
| `labels`  | string[] | No          | Labels a asignar                                 |

**Ejemplo de prompt:** `"creá un issue en ACPerezJulia/mcp-github-agent que diga 'agregar validación extra' con el label 'enhancement'"`

### `list_issues`

Lista los issues de un repositorio.

| Parámetro | Tipo     | Obligatorio | Descripción                                        |
| --------- | -------- | :---------: | ----------------------------------------------------- |
| `owner`   | string   | Sí          | Usuario u organización dueño del repo                |
| `repo`    | string   | Sí          | Nombre del repositorio                               |
| `state`   | enum     | No (default `open`) | `open`, `closed` o `all`                     |
| `labels`  | string[] | No          | Filtra issues que tengan estos labels                |

**Ejemplo de prompt:** `"mostrame los issues cerrados del repo mcp-github-agent"`

### `create_commit`

Crea o actualiza un archivo en un repositorio mediante un commit directo sobre una rama (usa la Contents API de GitHub).

| Parámetro | Tipo   | Obligatorio | Descripción                                                              |
| --------- | ------ | :---------: | --------------------------------------------------------------------------- |
| `owner`   | string | Sí          | Usuario u organización dueño del repo                                       |
| `repo`    | string | Sí          | Nombre del repositorio                                                      |
| `path`    | string | Sí          | Ruta del archivo dentro del repo (sin `/` inicial)                          |
| `content` | string | Sí          | Contenido en texto plano (el servidor lo codifica a base64 automáticamente) |
| `message` | string | Sí          | Mensaje del commit                                                          |
| `branch`  | string | No          | Rama destino (por defecto, la rama principal del repo)                     |
| `sha`     | string | No          | SHA del archivo existente — **obligatorio solo si estás actualizando un archivo que ya existe** |

**Ejemplo de prompt:** `"creá un archivo docs/notas.md en mi repo mcp-agent-test-demo con el contenido 'primera nota' y el mensaje de commit 'docs: agregar notas'"`

## Manejo de errores

Los errores de la API de GitHub se traducen a mensajes en lenguaje natural (nunca se expone un stack trace al LLM):

| Situación                          | Tipo de error         | Ejemplo de mensaje                                                        |
| ----------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| Token inválido o vencido (401)      | `AuthenticationError`  | "El token de GitHub no es válido o expiró. Revisá el archivo .env."          |
| Falta de permisos (403, sin rate limit) | `AuthenticationError` | "GitHub rechazó la operación por falta de permisos..."                  |
| Recurso no encontrado (404)         | `GitHubAPIError`       | "El repositorio o recurso solicitado no fue encontrado..."                  |
| Datos inválidos (422)                | `GitHubAPIError`       | Detalle específico devuelto por GitHub                                     |
| Rate limit (403/429)                 | —                       | Se reintenta automáticamente con backoff exponencial antes de fallar        |
| Sin conexión a internet              | `NetworkError`         | "No se pudo conectar con GitHub. Verificá tu conexión..."                   |

## Testing

```bash
npm test
```

15 tests con Vitest cubriendo schemas, operaciones (Octokit mockeado) y transformación de errores. Los tests **nunca** llaman a la API real de GitHub.

## Troubleshooting

**"GITHUB_TOKEN no está definido"** al arrancar el server → revisá que `.env` exista en la raíz del proyecto y tenga la variable `GITHUB_TOKEN` cargada.

**Antigravity solo muestra `ping` y no los demás tools** → el proceso del server sigue corriendo con una versión vieja del código. Corré `npm run build` y reconectá `github-agent` desde el panel de MCP Servers.

**Gemini no usa el tool, describe el repo en vez de ejecutar la acción** → sé explícita en el prompt, mencionando el nombre del tool (ej: "usá la tool `list_repositories`..."). Si el prompt es muy genérico, el LLM puede preferir usar sus propias herramientas de lectura de código en vez del tool MCP.

**Error 401 al llamar cualquier tool** → el token venció o no tiene los scopes necesarios (`repo`, `user`). Generá uno nuevo y actualizá `.env`.

**Error 404 en `create_issue`, `list_issues` o `create_commit`** → verificá que `owner`/`repo` estén bien escritos y que el token tenga acceso a ese repositorio.

## Licencia

MIT
