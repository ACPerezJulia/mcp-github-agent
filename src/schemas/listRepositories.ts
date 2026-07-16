import { z } from "zod";

export const listRepositoriesSchema = {
  visibility: z
    .enum(["all", "public", "private"])
    .default("all")
    .describe(
      "Filtra los repositorios por visibilidad: 'all' (todos), 'public' (solo públicos) o 'private' (solo privados). Por defecto 'all'."
    ),
};
