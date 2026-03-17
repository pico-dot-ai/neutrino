import type {
  BranchRef,
  FileCommit,
  RepoProvider,
  RepoRef
} from "../../contracts/src/repo-provider";

export class GitHubAdapter implements RepoProvider {
  async listRepos(_installationId: string): Promise<RepoRef[]> {
    throw new Error("Not implemented.");
  }

  async createBranch(_ref: BranchRef, _fromSha: string): Promise<void> {
    throw new Error("Not implemented.");
  }

  async commitFiles(
    _ref: BranchRef,
    _message: string,
    _files: FileCommit[]
  ): Promise<{ commitSha: string }> {
    throw new Error("Not implemented.");
  }

  async openPullRequest(
    _ref: BranchRef,
    _title: string,
    _body: string,
    _baseBranch: string
  ): Promise<{ pullRequestNumber: number; url: string }> {
    throw new Error("Not implemented.");
  }
}
