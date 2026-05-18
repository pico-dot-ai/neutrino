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
