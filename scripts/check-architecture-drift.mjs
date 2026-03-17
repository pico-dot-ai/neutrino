import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderArchitectureMarkdown } from "./render-architecture-doc.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

async function exists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  const raw = await fs.readFile(path.join(repoRoot, relativePath), "utf8");
  return JSON.parse(raw);
}

async function checkRequiredPaths(contract, failures) {
  for (const requiredPath of contract.requiredPaths) {
    if (!(await exists(requiredPath))) {
      failures.push(`Missing required path: ${requiredPath}`);
    }
  }
}

async function checkRuntimeBoundaries(contract, failures) {
  for (const appPath of contract.runtimeBoundaries.apps) {
    if (!(await exists(appPath))) {
      failures.push(`Missing app boundary path: ${appPath}`);
    }
  }

  if (!(await exists(contract.runtimeBoundaries.contractsRoot))) {
    failures.push(`Missing contracts root: ${contract.runtimeBoundaries.contractsRoot}`);
  }

  if (!(await exists(contract.runtimeBoundaries.adaptersRoot))) {
    failures.push(`Missing adapters root: ${contract.runtimeBoundaries.adaptersRoot}`);
  }
}

async function checkPorts(contract, failures) {
  for (const port of contract.ports) {
    if (!(await exists(port.contractFile))) {
      failures.push(`Missing contract file for port "${port.id}": ${port.contractFile}`);
    }
    for (const adapterPath of port.requiredAdapters) {
      if (!(await exists(adapterPath))) {
        failures.push(`Missing adapter for port "${port.id}": ${adapterPath}`);
      }
    }
  }
}

async function checkGeneratedDoc(contract, failures) {
  const generatedPath = contract.driftEnforcement.generatedDoc;
  if (!(await exists(generatedPath))) {
    failures.push(`Missing generated architecture doc: ${generatedPath}`);
    return;
  }

  const expected = `${renderArchitectureMarkdown(contract).trim()}\n`;
  const actual = await fs.readFile(path.join(repoRoot, generatedPath), "utf8");

  if (actual !== expected) {
    failures.push(
      `Generated architecture doc is out of date: ${generatedPath}. Run: node scripts/render-architecture-doc.mjs`
    );
  }
}

async function checkDriftEnforcementFiles(contract, failures) {
  const fields = ["renderScript", "checkScript", "workflow"];
  for (const field of fields) {
    const filePath = contract.driftEnforcement[field];
    if (!(await exists(filePath))) {
      failures.push(`Missing drift enforcement file (${field}): ${filePath}`);
    }
  }
}

async function walkFiles(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const output = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await walkFiles(relativePath)));
      continue;
    }
    output.push(relativePath);
  }

  return output;
}

async function checkNoDirectAdapterImports(contract, failures) {
  const searchableRoots = contract.runtimeBoundaries.apps;
  const importPattern = /from\s+["'][^"']*adapters\//;
  const candidateExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs"
  ]);

  for (const root of searchableRoots) {
    if (!(await exists(root))) {
      continue;
    }

    const files = await walkFiles(root);
    for (const file of files) {
      const ext = path.extname(file);
      if (!candidateExtensions.has(ext)) {
        continue;
      }

      const content = await fs.readFile(path.join(repoRoot, file), "utf8");
      if (importPattern.test(content)) {
        failures.push(
          `Direct adapter import found in ${file}. App code must import contracts, not adapters.`
        );
      }
    }
  }
}

async function main() {
  const failures = [];
  const contract = await readJson("architecture/contract.json");

  await checkRequiredPaths(contract, failures);
  await checkRuntimeBoundaries(contract, failures);
  await checkPorts(contract, failures);
  await checkGeneratedDoc(contract, failures);
  await checkDriftEnforcementFiles(contract, failures);
  await checkNoDirectAdapterImports(contract, failures);

  if (failures.length > 0) {
    console.error("Architecture drift check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Architecture drift check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
