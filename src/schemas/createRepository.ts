import { z } from "zod";

export const createRepositorySchema = {
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "El nombre solo puede contener letras, números, puntos, guiones y guiones bajos"
    )
    .refine((name) => !name.endsWith(".git") && !name.endsWith(".wiki"), {
      message: "El nombre no puede terminar en '.git' ni en '.wiki'",
    })
    .describe(
      "Nombre del repositorio a crear. Máximo 100 caracteres, solo letras, números, puntos, guiones y guiones bajos."
    ),
  description: z
    .string()
    .max(350)
    .optional()
    .describe("Descripción breve y opcional del repositorio."),
  private: z
    .boolean()
    .default(false)
    .describe(
      "Si es true, el repositorio se crea como privado. Por defecto false (público)."
    ),
};
