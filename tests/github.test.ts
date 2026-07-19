import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockListForAuthenticatedUser, mockCreateForAuthenticatedUser } =
  vi.hoisted(() => ({
    mockListForAuthenticatedUser: vi.fn(),
    mockCreateForAuthenticatedUser: vi.fn(),
  }));

vi.mock("../src/github/client.js", () => ({
  octokit: {
    rest: {
      repos: {
        listForAuthenticatedUser: mockListForAuthenticatedUser,
        createForAuthenticatedUser: mockCreateForAuthenticatedUser,
      },
    },
  },
}));

const { listRepositories, createRepository } = await import(
  "../src/github/operations.js"
);
const { GitHubAPIError } = await import("../src/errors/index.js");

beforeEach(() => {
  mockListForAuthenticatedUser.mockReset();
  mockCreateForAuthenticatedUser.mockReset();
});

describe("listRepositories", () => {
  it("le pasa el filtro de visibilidad a Octokit y devuelve los datos", async () => {
    mockListForAuthenticatedUser.mockResolvedValueOnce({
      data: [{ full_name: "octocat/hello" }],
    });

    const repos = await listRepositories({ visibility: "public" });

    expect(mockListForAuthenticatedUser).toHaveBeenCalledWith({
      visibility: "public",
    });
    expect(repos).toEqual([{ full_name: "octocat/hello" }]);
  });

  it("traduce un error de Octokit a un error custom en vez de propagar el crudo", async () => {
    mockListForAuthenticatedUser.mockRejectedValueOnce({
      status: 404,
      message: "Not Found",
    });

    await expect(listRepositories({ visibility: "all" })).rejects.toThrow(
      GitHubAPIError
    );
  });
});

describe("createRepository", () => {
  it("crea el repositorio con los parámetros correctos", async () => {
    mockCreateForAuthenticatedUser.mockResolvedValueOnce({
      data: { html_url: "https://github.com/octocat/mi-repo" },
    });

    const repo = await createRepository({
      name: "mi-repo",
      private: true,
    });

    expect(mockCreateForAuthenticatedUser).toHaveBeenCalledWith({
      name: "mi-repo",
      description: undefined,
      private: true,
    });
    expect(repo.html_url).toBe("https://github.com/octocat/mi-repo");
  });
});
