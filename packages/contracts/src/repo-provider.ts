export type RepoRef = {
  owner: string;
  name: string;
};

export type BranchRef = RepoRef & {
  branch: string;
};

export type FileCommit = {
  path: string;
  content: string;
  mode?: "text" | "base64";
};

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
