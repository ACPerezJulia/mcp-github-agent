import { z } from "zod";

export const createCommitSchema = {
  owner: z
    .string()
    .min(1)
    .max(39)
    .describe("Usuario u organización dueño del repositorio (ej: 'octocat')."),
  repo: z
    .string()
    .min(1)
    .max(100)
    .describe("Nombre del repositorio donde aplicar el commit."),
  path: z
    .string()
    .min(1)
    .refine((p) => !p.startsWith("/"), {
      message: "La ruta no puede empezar con '/'",
    })
    .describe(
      "Ruta del archivo dentro del repositorio (ej: 'docs/README.md'), sin barra inicial."
    ),
  content: z
    .string()
    .min(1)
    .describe(
      "Contenido de texto plano del archivo. Se codifica a base64 automáticamente antes de enviarlo a GitHub."
    ),
  message: z.string().min(1).describe("Mensaje descriptivo del commit."),
  branch: z
    .string()
    .optional()
    .describe(
      "Rama donde aplicar el commit. Si se omite, se usa la rama por defecto del repositorio."
    ),
  sha: z
    .string()
    .optional()
    .describe(
      "SHA del blob del archivo existente. Requerido solo si se está actualizando un archivo que ya existe; se omite si es un archivo nuevo."
    ),
};
