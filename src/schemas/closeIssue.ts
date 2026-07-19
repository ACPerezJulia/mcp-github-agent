import { z } from "zod";

export const closeIssueSchema = {
  owner: z
    .string()
    .min(1)
    .max(39)
    .describe("Usuario u organización dueño del repositorio (ej: 'octocat')."),
  repo: z
    .string()
    .min(1)
    .max(100)
    .describe("Nombre del repositorio donde está el issue."),
  issueNumber: z
    .number()
    .int()
    .positive()
    .describe("Número del issue a cerrar."),
};
