import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const starterVersionPath = path.join(repoRoot, "pico-app-container", "VERSION.uuid");
const starterReadmePath = path.join(repoRoot, "pico-app-container", "README.md");
const platformDocPath = path.join(repoRoot, "docs", "platform-baseline.md");

function run(command) {
  return execSync(command, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

function getDiffBase() {
  const candidates = [
    "origin/main",
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : ""
  ].filter(Boolean);

  for (const target of candidates) {
    try {
      return run(`git merge-base HEAD ${target}`);
    } catch {
      // Try next candidate.
    }
  }

  try {
    return run("git rev-parse HEAD~1");
  } catch {
    return "HEAD";
  }
}

function extractVersion(content, pattern, label) {
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Missing ${label} version marker.`);
  }

  return match[1];
}

async function main() {
  const [versionRaw, starterReadme, platformDoc] = await Promise.all([
    fs.readFile(starterVersionPath, "utf8"),
    fs.readFile(starterReadmePath, "utf8"),
    fs.readFile(platformDocPath, "utf8")
  ]);

  const canonicalVersion = versionRaw.trim();
  const readmeVersion = extractVersion(
    starterReadme,
    /Starter Version UUID:\s*`([^`]+)`/,
    "starter README"
  );
  const platformVersion = extractVersion(
    platformDoc,
    /Current Starter Version UUID:\s*`([^`]+)`/,
    "platform baseline"
  );

  const failures = [];

  if (!canonicalVersion) {
    failures.push("pico-app-container/VERSION.uuid is empty.");
  }

  if (canonicalVersion !== readmeVersion) {
    failures.push(
      `Starter README UUID (${readmeVersion}) does not match VERSION.uuid (${canonicalVersion}).`
    );
  }

  if (canonicalVersion !== platformVersion) {
    failures.push(
      `docs/platform-baseline UUID (${platformVersion}) does not match VERSION.uuid (${canonicalVersion}).`
    );
  }

  const diffBase = getDiffBase();
  const changedFiles = run(`git diff --name-only ${diffBase} HEAD`)
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);

  const starterChanges = changedFiles.filter((file) =>
    file.startsWith("pico-app-container/")
  );
  const significantStarterChanges = starterChanges.filter(
    (file) => file !== "pico-app-container/VERSION.uuid"
  );

  const versionChanged = changedFiles.includes("pico-app-container/VERSION.uuid");
  const readmeChanged = changedFiles.includes("pico-app-container/README.md");
  const platformDocChanged = changedFiles.includes("docs/platform-baseline.md");

  if (significantStarterChanges.length > 0) {
    if (!versionChanged) {
      failures.push(
        "pico-app-container changed without updating pico-app-container/VERSION.uuid."
      );
    }

    if (!readmeChanged) {
      failures.push(
        "pico-app-container changed without updating pico-app-container/README.md UUID line."
      );
    }

    if (!platformDocChanged) {
      failures.push(
        "pico-app-container changed without updating docs/platform-baseline.md UUID line."
      );
    }
  }

  if (failures.length > 0) {
    console.error("pico-app-container version check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("pico-app-container version check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
