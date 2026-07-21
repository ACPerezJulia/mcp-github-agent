import { describe, it, expect, vi } from "vitest";
import {
  translateGitHubError,
  AuthenticationError,
  GitHubAPIError,
  NetworkError,
} from "../src/errors/index.js";
import { withRetry } from "../src/utils/retry.js";

describe("translateGitHubError", () => {
  it("convierte un 401 en AuthenticationError con mensaje claro", () => {
    const error = translateGitHubError({ status: 401, message: "Bad credentials" });
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toContain("token");
  });

  it("convierte un 403 genuino (sin señales de rate limit) en AuthenticationError", () => {
    const error = translateGitHubError({
      status: 403,
      message: "Resource not accessible by personal access token",
    });
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toContain("permisos");
  });

  it("convierte un 403 con señales de rate limit en GitHubAPIError, no en AuthenticationError", () => {
    const error = translateGitHubError({
      status: 403,
      message: "You have exceeded a secondary rate limit",
      response: { headers: { "x-ratelimit-remaining": "0" } },
    });
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect(error.message).toContain("rate limit");
  });

  it("convierte un 404 en GitHubAPIError con mensaje claro", () => {
    const error = translateGitHubError({ status: 404, message: "Not Found" });
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect(error.message).toContain("no fue encontrado");
  });

  it("convierte un 422 por sha faltante en un mensaje específico, no el genérico de GitHub", () => {
    const error = translateGitHubError({
      status: 422,
      message: 'Invalid request.\n\n"sha" wasn\'t supplied.',
    });
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect(error.message).toContain("sha");
    expect(error.message).toContain("ya existe en el repositorio");
  });

  it("convierte otro 422 (no relacionado a sha) reenviando el mensaje de GitHub", () => {
    const error = translateGitHubError({
      status: 422,
      message: "Repository creation failed.",
    });
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect(error.message).toContain("Repository creation failed");
  });

  it("convierte un error sin status (falla de red) en NetworkError", () => {
    const error = translateGitHubError(new TypeError("fetch failed"));
    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe("withRetry", () => {
  it("reintenta ante un rate limit y resuelve cuando el llamado finalmente funciona", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw {
          status: 403,
          message: "rate limit exceeded",
          response: { headers: { "x-ratelimit-remaining": "0" } },
        };
      }
      return "ok";
    });

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 5 });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("no reintenta errores que no son de rate limit", async () => {
    const fn = vi.fn(async () => {
      throw { status: 404, message: "Not Found" };
    });

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 5 })
    ).rejects.toMatchObject({ status: 404 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
