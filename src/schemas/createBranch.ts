import { z } from "zod";

export const createBranchSchema = {
  owner: z
    .string()
    .min(1)
    .max(39)
    .describe("Usuario u organización dueño del repositorio (ej: 'octocat')."),
  repo: z
    .string()
    .min(1)
    .max(100)
    .describe("Nombre del repositorio donde crear la rama."),
  branchName: z
    .string()
    .min(1)
    .refine(
      (name) =>
        !/[\s~^:?*[\\]/.test(name) &&
        !name.startsWith(".") &&
        !name.startsWith("/") &&
        !name.endsWith("/") &&
        !name.endsWith(".lock") &&
        !name.includes("..") &&
        !name.includes("//"),
      {
        message:
          "El nombre de la rama no es un nombre de referencia de git válido (sin espacios ni ~^:?*[\\, no puede empezar/terminar con '.', '/' o '.lock', ni contener '..' o '//').",
      }
    )
    .describe(
      "Nombre de la nueva rama a crear (ej: 'feature/nueva-funcionalidad')."
    ),
  baseBranch: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Rama base desde la cual crear la nueva rama. Si se omite, se usa la rama por defecto del repositorio."
    ),
};
