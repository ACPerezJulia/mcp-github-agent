import { z } from "zod";

export const createIssueSchema = {
  owner: z
    .string()
    .min(1)
    .max(39)
    .describe("Usuario u organización dueño del repositorio (ej: 'octocat')."),
  repo: z
    .string()
    .min(1)
    .max(100)
    .describe("Nombre del repositorio donde se va a crear el issue."),
  title: z
    .string()
    .min(1)
    .max(256)
    .describe("Título del issue. Máximo 256 caracteres."),
  body: z
    .string()
    .max(65536)
    .optional()
    .describe("Descripción del issue en formato Markdown. Opcional."),
  labels: z
    .array(z.string())
    .optional()
    .describe("Lista de nombres de labels a asignar al issue. Opcional."),
};
