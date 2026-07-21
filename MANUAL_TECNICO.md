# Manual técnico — mcp-github-agent

No es un manual de usuario (eso ya lo cubre el README). Es una **bitácora técnica**: para que alguien que se suba al proyecto después (o yo misma en 6 meses) no tenga que re-diagnosticar desde cero algo que ya se resolvió una vez — por ejemplo, después de una migración de entorno, un cambio de versión de una dependencia, o simplemente al volver al código después de tiempo.

---

## 1. Mapa rápido para orientarse

Antes de tocar nada, leer en este orden: `README.md` (arquitectura + qué hace cada tool) → `src/server.ts` (qué tools están registrados) → la carpeta específica que se necesite tocar (`schemas/`, `github/`, `errors/`, `tools/`).

Regla de oro del proyecto: cada capa tiene una sola responsabilidad. Si algo parece que "debería estar en otro lado", probablemente lo esté — `schemas/` valida y documenta, `operations.ts` habla con Octokit, `errors/` traduce, `tools/` conecta todo con el protocolo MCP.

---

## 2. Anatomía de un tool completo, explicado línea por línea

Para entender el proyecto rápido, más que leer teoría sirve ver un tool real de punta a punta. Usamos `close_issue` porque es el más corto y pasa por las 4 capas sin marearte. El flujo es siempre: **schema → operación → tool → registro en server.ts**.

### 2.1. El schema (`src/schemas/closeIssue.ts`)

```ts
import { z } from "zod";                    // Zod: valida Y documenta al mismo tiempo, con la misma pieza de código

export const closeIssueSchema = {           // 👈 OJO: esto NO es un objeto Zod todavía.
                                             //    Es un objeto plano { campo: validador }. El SDK de MCP
                                             //    lo envuelve con z.object() por dentro cuando lo necesita.
  owner: z
    .string()                               // tiene que ser texto
    .min(1)                                 // no puede venir vacío
    .max(39)                                // 👈 límite REAL de GitHub para usernames (no un número inventado)
    .describe("Usuario u organización dueño del repositorio (ej: 'octocat')."),
    // 👆 esto es lo que Gemini LEE para saber qué mandar en este campo — no es un comentario para vos

  repo: z.string().min(1).max(100).describe("Nombre del repositorio donde está el issue."),
  // mismo patrón que arriba: tipo + límites reales + descripción para el LLM

  issueNumber: z
    .number()
    .int()                                   // tiene que ser un entero (rechaza 3.5)
    .positive()                              // tiene que ser mayor a 0
    .describe("Número del issue a cerrar."),
};
```

**Qué hace esta pieza:** define QUÉ datos necesita el tool y CÓMO tienen que verse. Si Gemini manda algo que no cumple esto (ej: `issueNumber: -1`), el pedido **ni siquiera llega a nuestro código** — el SDK de MCP lo rechaza automáticamente antes de ejecutar nada.

### 2.2. La operación (`src/github/operations.ts`)

```ts
export async function closeIssue(params: CloseIssueParams) {   // 👈 params ya viene validado y tipado (paso 2.1)
  return runGitHubOperation(async () => {                       // 👈 wrapper compartido: da retry + traducción
                                                                  //    de errores gratis, sin repetir código en
                                                                  //    cada una de las 9 funciones de este archivo
    const { data } = await octokit.rest.issues.update({           // 👈 ACÁ se llama a la API real de GitHub
      owner: params.owner,
      repo: params.repo,
      issue_number: params.issueNumber,      // 👈 OJO: acá se traduce camelCase (nuestro) → snake_case (GitHub)
      state: "closed",                       // 👈 esto es lo que realmente "cierra" el issue — no hay un
    });                                       //    endpoint "close", es un cambio de estado del recurso
    return data;                              // lo que devuelve Octokit, tal cual, sin filtrar nada todavía
  });
}
```

**Qué hace esta pieza:** es la **única** parte del código que sabe hablar con Octokit. Si mañana cambia la librería de GitHub que usamos, esto es lo único que hay que tocar — ni el schema, ni el tool, ni el server se enteran.

### 2.3. El tool (`src/tools/closeIssue.ts`)

```ts
export function registerCloseIssueTool(server: McpServer) {   // 👈 se llama UNA vez, al arrancar el server
  server.registerTool(
    "close_issue",                              // 👈 el nombre que el LLM usa para invocar este tool puntual
    {
      title: "Cerrar issue",
      description: "Cierra un issue existente en un repositorio de GitHub.",
      // 👆 esto es lo que Gemini lee en `tools/list`, ANTES de decidir si usar este tool o no
      inputSchema: closeIssueSchema,            // 👈 acá se conecta el schema del paso 2.1
    },
    async ({ owner, repo, issueNumber }) => {    // 👈 esta función corre CADA VEZ que Gemini invoca el tool
      try {
        const issue = await closeIssue({ owner, repo, issueNumber });   // 👈 llama a la operación del paso 2.2
        return {
          content: [{ type: "text", text: `Issue #${issue.number} cerrado: ${issue.html_url}` }],
        };  // 👆 esto es literalmente lo que Gemini VE como resultado del tool
      } catch (error) {
        return toToolErrorResult(error);   // 👈 si algo falla, mensaje en español con isError: true — nunca un crash
      }
    }
  );
}
```

**Qué hace esta pieza:** conecta todo lo anterior con el protocolo MCP. Es la única capa que "sabe" que del otro lado hay un LLM escuchando.

### 2.4. El registro (`src/server.ts`, una sola línea)

```ts
registerCloseIssueTool(server);   // 👈 literalmente todo lo que hace falta para que el tool exista y funcione
```

**Resumen del flujo:** schema (valida y documenta) → operación (habla con Octokit) → tool (conecta eso con el protocolo MCP) → una línea en `server.ts` (lo registra). Los otros 7 tools que hablan con GitHub siguen exactamente el mismo patrón — solo cambian los datos y el endpoint de Octokit.

**La excepción: `ping`.** No sigue este patrón porque no tiene nada que validar (no recibe parámetros) ni ninguna API externa que llamar — por eso no tiene schema propio ni función en `operations.ts`, y se registra directo e inline en `server.ts` (sin pasar por `src/tools/`). Con `ping` + los 7 con este patrón + `close_issue` como ejemplo, suman los 9 tools totales del servidor.

---

## 3. Registro de incidentes reales

### Incidente 1 — `dotenv` escribía a `stdout` y rompía el protocolo

- **Síntoma:** al cargar `.env`, aparecía una línea de texto plano en `stdout` antes de cualquier mensaje JSON-RPC — en un servidor MCP real (stdio), esto corrompe la comunicación con el Host apenas arranca.
- **Causa raíz:** `dotenv` imprime un mensaje informativo (con un tip aleatorio) a `stdout` cada vez que `dotenv.config()` carga variables, salvo que se le pida explícitamente que no lo haga.
- **Cómo se diagnosticó:** se corrió una operación redirigiendo `stdout` y `stderr` a archivos separados (`comando 1>stdout.txt 2>stderr.txt`) y se confirmó en qué stream aparecía la línea.
- **Solución:** pasar `{ quiet: true }` como opción a `dotenv.config()` en `src/github/client.ts`.
- **Si reaparece (ej: al actualizar `dotenv` a una major nueva):** volver a redirigir stdout/stderr por separado en cualquier operación que toque `client.ts` y confirmar que `stdout` queda vacío. Regla general para cualquier dependencia nueva que se agregue al proyecto: probarla así antes de confiar en que no ensucia `stdout`.

### Incidente 2 — 422 de GitHub por `sha` faltante mostraba el mensaje crudo en inglés

- **Síntoma:** al intentar actualizar (no crear) un archivo vía `create_commit` sin pasar `sha`, el mensaje que recibía el usuario final era el texto original de GitHub (`Invalid request... "sha" wasn't supplied`), no traducido — inconsistente con el resto de los errores del proyecto, que sí tienen redacción propia en español.
- **Causa raíz:** decisión de diseño original: `sha` se dejó opcional en el schema de Zod a propósito (no se puede saber si un archivo ya existe solo mirando el input), asumiendo que el 422 resultante se traduciría genéricamente como cualquier otro 422 — pero ese caso puntual no tenía una traducción propia, solo pasaba el mensaje de GitHub tal cual.
- **Cómo se diagnosticó:** se disparó el error real contra un archivo existente en un repo de prueba (sin pasar `sha`) para confirmar el texto EXACTO que devuelve GitHub, en vez de adivinarlo.
- **Solución:** en `src/errors/index.ts`, dentro del `case 422` de `translateGitHubError`, se agregó una detección (`/sha/i.test(error.message)`) que da un mensaje propio en español si el 422 menciona "sha"; cualquier otro 422 sigue cayendo al mensaje genérico.
- **Commit relacionado:** `cd2b43b` — "fix: mensaje específico para 422 por sha faltante en create_commit"
- **Si aparece un caso parecido (ej: un 422 recurrente y poco claro al crear una rama que ya existe):** mismo patrón — disparar el error real contra GitHub, confirmar el texto exacto, agregar un caso específico dentro del mismo `switch` de `translateGitHubError` en vez de dejarlo en el mensaje genérico.

### Nota de diseño — formato de `ref` distinto entre `git.getRef` y `git.createRef`

No es un bug, es una inconsistencia real de la API de Octokit que hay que recordar si se vuelve a tocar este código:

- `octokit.rest.git.getRef({ ref })` espera el ref **sin** el prefijo `refs/` (ej: `"heads/main"`).
- `octokit.rest.git.createRef({ ref })` espera el ref **completo, con** el prefijo (ej: `"refs/heads/nombre-rama"`).

Se confirmó corriendo `.endpoint(...)` en vez de ejecutar la llamada real, para ver la URL exacta que arma cada método antes de escribir el código — no se asumió el formato de memoria. **Si se agrega en el futuro otro tool que toque refs de git (tags, por ejemplo), repetir esa verificación antes de asumir el formato.**

### Nota de diseño — `ValidationError` casi nunca se dispara en una sesión real de Antigravity

No es un bug, es un comportamiento esperado que puede confundir a alguien nuevo leyendo el código: el SDK de MCP valida los argumentos de un tool contra su `inputSchema` (Zod) **antes** de invocar el handler. Si el input es inválido, el SDK tira su propio error y el código de este proyecto ni se llega a ejecutar. Por eso, buscar `ValidationError` disparándose en logs de una sesión real de Antigravity no va a dar resultado — es esperado. Donde sí se ejercita: `tests/tools.test.ts`, que valida los schemas de forma aislada, sin pasar por el SDK.

---

## 4. Cómo agregar un tool nuevo (el patrón que sigue todo el proyecto)

1. **Schema** — crear `src/schemas/nombreTool.ts`: un shape de Zod plano (no envuelto en `z.object()`), con `.describe()` en cada campo pensado para que lo lea el LLM, y restricciones que reflejen reglas REALES de GitHub (verificadas, no inventadas).
2. **Operación** — agregar una función en `src/github/operations.ts`, envuelta en `runGitHubOperation(...)` (esto ya da retry + traducción de errores gratis, sin repetir código).
3. **Tool** — crear `src/tools/nombreTool.ts` con una función `registerNombreTool(server)` que llama a `server.registerTool(...)` usando el schema del paso 1, y en el handler llama a la operación del paso 2 dentro de un `try/catch` que devuelve `toToolErrorResult(error)` en el `catch`.
4. **Registrar** — importar y llamar `registerNombreTool(server)` en `src/server.ts`.
5. **Compilar y probar contra la API real** (`npm run build` + un script descartable) antes de confiar en que funciona — no asumir que compila implica que funciona.
6. **Tests** — al menos uno para el schema (`tests/tools.test.ts`) y uno para la operación con Octokit mockeado (`tests/github.test.ts`).
7. **Documentar** — sumar el tool al README (tabla de parámetros + ejemplo de prompt).
8. **Commitear como una unidad** — `feat: tool nombre_tool`, con todos los archivos de los pasos 1-3 y el registro del paso 4 juntos.
