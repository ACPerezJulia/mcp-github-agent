import { z } from "zod";
import { octokit } from "./client.js";
import { listRepositoriesSchema } from "../schemas/listRepositories.js";
import { createRepositorySchema } from "../schemas/createRepository.js";
import { createIssueSchema } from "../schemas/createIssue.js";
import { listIssuesSchema } from "../schemas/listIssues.js";
import { createCommitSchema } from "../schemas/createCommit.js";

const listRepositoriesObject = z.object(listRepositoriesSchema);
type ListRepositoriesParams = z.infer<typeof listRepositoriesObject>;

const createRepositoryObject = z.object(createRepositorySchema);
type CreateRepositoryParams = z.infer<typeof createRepositoryObject>;

const createIssueObject = z.object(createIssueSchema);
type CreateIssueParams = z.infer<typeof createIssueObject>;

const listIssuesObject = z.object(listIssuesSchema);
type ListIssuesParams = z.infer<typeof listIssuesObject>;

const createCommitObject = z.object(createCommitSchema);
type CreateCommitParams = z.infer<typeof createCommitObject>;

export async function listRepositories(params: ListRepositoriesParams) {
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    visibility: params.visibility,
  });
  return data;
}

export async function createRepository(params: CreateRepositoryParams) {
  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name: params.name,
    description: params.description,
    private: params.private,
  });
  return data;
}

export async function createIssue(params: CreateIssueParams) {
  const { data } = await octokit.rest.issues.create({
    owner: params.owner,
    repo: params.repo,
    title: params.title,
    body: params.body,
    labels: params.labels,
  });
  return data;
}

export async function listIssues(params: ListIssuesParams) {
  const { data } = await octokit.rest.issues.listForRepo({
    owner: params.owner,
    repo: params.repo,
    state: params.state,
    labels: params.labels?.join(","),
  });
  return data;
}

export async function createCommit(params: CreateCommitParams) {
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner: params.owner,
    repo: params.repo,
    path: params.path,
    message: params.message,
    content: Buffer.from(params.content, "utf-8").toString("base64"),
    branch: params.branch,
    sha: params.sha,
  });
  return data;
}
