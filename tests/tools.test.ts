import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createRepositorySchema } from "../src/schemas/createRepository.js";
import { createIssueSchema } from "../src/schemas/createIssue.js";
import { listRepositoriesSchema } from "../src/schemas/listRepositories.js";
import { createBranchSchema } from "../src/schemas/createBranch.js";
import { closeIssueSchema } from "../src/schemas/closeIssue.js";

const repoSchema = z.object(createRepositorySchema);
const issueSchema = z.object(createIssueSchema);
const listReposSchema = z.object(listRepositoriesSchema);
const branchSchema = z.object(createBranchSchema);
const closeSchema = z.object(closeIssueSchema);

describe("createRepositorySchema", () => {
  it("acepta un nombre válido", () => {
    expect(repoSchema.safeParse({ name: "mi-repo" }).success).toBe(true);
  });

  it("rechaza nombres con caracteres inválidos (espacios)", () => {
    const result = repoSchema.safeParse({ name: "mi repo con espacios" });
    expect(result.success).toBe(false);
  });

  it("rechaza nombres que terminan en .git", () => {
    const result = repoSchema.safeParse({ name: "algo.git" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(".git");
    }
  });
});

describe("createIssueSchema", () => {
  it("rechaza un title vacío", () => {
    const result = issueSchema.safeParse({
      owner: "octocat",
      repo: "hello",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("acepta un issue válido sin body ni labels", () => {
    const result = issueSchema.safeParse({
      owner: "octocat",
      repo: "hello",
      title: "Bug encontrado",
    });
    expect(result.success).toBe(true);
  });
});

describe("listRepositoriesSchema", () => {
  it("usa 'all' como valor por defecto cuando no se especifica visibility", () => {
    const result = listReposSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("all");
    }
  });

  it("rechaza un valor de visibility que no es 'all', 'public' ni 'private'", () => {
    const result = listReposSchema.safeParse({ visibility: "privado" });
    expect(result.success).toBe(false);
  });
});

describe("createBranchSchema", () => {
  it("acepta un nombre de rama válido", () => {
    const result = branchSchema.safeParse({
      owner: "octocat",
      repo: "hello",
      branchName: "feature/nueva-funcionalidad",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza nombres de rama con espacios", () => {
    const result = branchSchema.safeParse({
      owner: "octocat",
      repo: "hello",
      branchName: "rama con espacios",
    });
    expect(result.success).toBe(false);
  });
});

describe("closeIssueSchema", () => {
  it("rechaza un issueNumber que no es un entero positivo", () => {
    const result = closeSchema.safeParse({
      owner: "octocat",
      repo: "hello",
      issueNumber: -3,
    });
    expect(result.success).toBe(false);
  });

  it("acepta un issueNumber válido", () => {
    const result = closeSchema.safeParse({
      owner: "octocat",
      repo: "hello",
      issueNumber: 42,
    });
    expect(result.success).toBe(true);
  });
});
