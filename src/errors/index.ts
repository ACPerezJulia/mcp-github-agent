import { z } from "zod";
import { isRateLimitError } from "../utils/retry.js";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class GitHubAPIError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GitHubAPIError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

interface OctokitLikeError {
  status: number;
  message: string;
}

function isOctokitError(error: unknown): error is OctokitLikeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

/**
 * Traduce un error crudo (de Octokit o de la red) a uno de nuestros 4 tipos,
 * con un mensaje en lenguaje natural para el usuario final.
 */
export function translateGitHubError(error: unknown): Error {
  if (!isOctokitError(error)) {
    return new NetworkError(
      "No se pudo conectar con GitHub. Verificá tu conexión a internet e intentá de nuevo."
    );
  }

  switch (error.status) {
    case 401:
      return new AuthenticationError(
        "El token de GitHub no es válido o expiró. Revisá el archivo .env."
      );
    case 403:
      if (isRateLimitError(error)) {
        return new GitHubAPIError(
          "GitHub limitó la cantidad de pedidos (rate limit) y se agotaron los reintentos automáticos. Esperá unos minutos e intentá de nuevo.",
          403
        );
      }
      return new AuthenticationError(
        "GitHub rechazó la operación por falta de permisos. Verificá que el token tenga los scopes necesarios (repo, user, admin:org)."
      );
    case 404:
      return new GitHubAPIError(
        "El repositorio o recurso solicitado no fue encontrado. Verificá el nombre e intentá de nuevo.",
        404
      );
    case 422:
      if (/sha/i.test(error.message)) {
        return new GitHubAPIError(
          "El archivo que intentás commitear ya existe en el repositorio. Para actualizar un archivo existente hace falta indicar su sha actual (parámetro 'sha' del tool create_commit) — si es un archivo nuevo, no debería hacer falta.",
          422
        );
      }
      return new GitHubAPIError(
        `GitHub rechazó los datos enviados: ${error.message}`,
        422
      );
    default:
      return new GitHubAPIError(
        `Error inesperado de la API de GitHub (status ${error.status}): ${error.message}`,
        error.status
      );
  }
}

/**
 * Convierte cualquier error atrapado en un handler de tool a la forma que
 * espera el SDK de MCP, con isError: true para que el LLM vea el mensaje.
 */
export function toToolErrorResult(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Ocurrió un error inesperado.";
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/**
 * Valida un input contra un shape de Zod y tira ValidationError con un mensaje
 * legible si falla. Se usa para testear schemas de forma aislada del SDK.
 */
export function parseOrThrow<Shape extends z.ZodRawShape>(
  shape: Shape,
  input: unknown
): z.infer<z.ZodObject<Shape>> {
  const result = z.object(shape).safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new ValidationError(`Input inválido: ${issues}`);
  }
  return result.data;
}
