import { z } from "zod";

export const listIssuesSchema = {
  owner: z
    .string()
    .min(1)
    .max(39)
    .describe("Usuario u organización dueño del repositorio (ej: 'octocat')."),
  repo: z
    .string()
    .min(1)
    .max(100)
    .describe("Nombre del repositorio del cual listar issues."),
  state: z
    .enum(["open", "closed", "all"])
    .default("open")
    .describe(
      "Filtra issues por estado: 'open', 'closed' o 'all'. Por defecto 'open'."
    ),
  labels: z
    .array(z.string())
    .optional()
    .describe(
      "Lista de nombres de labels para filtrar issues que los tengan asignados. Opcional."
    ),
};
