import { z } from "zod";

export const createPullRequestSchema = {
  owner: z
    .string()
    .min(1)
    .max(39)
    .describe("Usuario u organización dueño del repositorio (ej: 'octocat')."),
  repo: z
    .string()
    .min(1)
    .max(100)
    .describe("Nombre del repositorio donde crear el pull request."),
  title: z
    .string()
    .min(1)
    .max(256)
    .describe(
      "Título del pull request. Máximo 256 caracteres (un PR es, por dentro, un issue de GitHub, y comparte ese límite)."
    ),
  head: z
    .string()
    .min(1)
    .describe("Rama que contiene los cambios a mergear (rama origen)."),
  base: z
    .string()
    .min(1)
    .describe("Rama destino a la que se quiere mergear (ej: 'main')."),
  body: z
    .string()
    .max(65536)
    .optional()
    .describe("Descripción del pull request en formato Markdown. Opcional."),
};
