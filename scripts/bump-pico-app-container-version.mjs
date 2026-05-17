import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const starterVersionPath = path.join(repoRoot, "pico-app-container", "VERSION.uuid");
const starterReadmePath = path.join(repoRoot, "pico-app-container", "README.md");
const platformDocPath = path.join(repoRoot, "docs", "platform-baseline.md");

function toUuidString(bytes) {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function createUuidV7() {
  const timestamp = BigInt(Date.now());
  const random = crypto.randomBytes(10);
  const bytes = new Uint8Array(16);

  bytes[0] = Number((timestamp >> 40n) & 0xffn);
  bytes[1] = Number((timestamp >> 32n) & 0xffn);
  bytes[2] = Number((timestamp >> 24n) & 0xffn);
  bytes[3] = Number((timestamp >> 16n) & 0xffn);
  bytes[4] = Number((timestamp >> 8n) & 0xffn);
  bytes[5] = Number(timestamp & 0xffn);

  bytes[6] = (0x70 | (random[0] & 0x0f)) & 0xff;
  bytes[7] = random[1];
  bytes[8] = (0x80 | (random[2] & 0x3f)) & 0xff;
  bytes[9] = random[3];
  bytes[10] = random[4];
  bytes[11] = random[5];
  bytes[12] = random[6];
  bytes[13] = random[7];
  bytes[14] = random[8];
  bytes[15] = random[9];

  return toUuidString(bytes);
}

function replaceVersionLine(content, pattern, version) {
  if (!pattern.test(content)) {
    throw new Error(`Missing version marker for pattern ${pattern}`);
  }

  return content.replace(pattern, (_match, prefix) => `${prefix}\`${version}\``);
}

async function main() {
  const version = createUuidV7();

  const [starterReadme, platformDoc] = await Promise.all([
    fs.readFile(starterReadmePath, "utf8"),
    fs.readFile(platformDocPath, "utf8")
  ]);

  const updatedStarterReadme = replaceVersionLine(
    starterReadme,
    /(Starter Version UUID:\s*)`[^`]+`/,
    version
  );
  const updatedPlatformDoc = replaceVersionLine(
    platformDoc,
    /(Current Starter Version UUID:\s*)`[^`]+`/,
    version
  );

  await Promise.all([
    fs.writeFile(starterVersionPath, `${version}\n`, "utf8"),
    fs.writeFile(starterReadmePath, updatedStarterReadme, "utf8"),
    fs.writeFile(platformDocPath, updatedPlatformDoc, "utf8")
  ]);

  process.stdout.write(`${version}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
