import type { BranchRef, FileCommit, RepoRef } from "@neutrino/schema";

export interface RepoProvider {
  listRepos(installationId: string): Promise<RepoRef[]>;
  createBranch(ref: BranchRef, fromSha: string): Promise<void>;
  commitFiles(
    ref: BranchRef,
    message: string,
    files: FileCommit[]
  ): Promise<{ commitSha: string }>;
  openPullRequest(
    ref: BranchRef,
    title: string,
    body: string,
    baseBranch: string
  ): Promise<{ pullRequestNumber: number; url: string }>;
}
