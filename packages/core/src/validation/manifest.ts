import type { PlatformManifest, ResourceKind } from "@neutrino/schema";

const supportedKinds = new Set<ResourceKind>([
  "pico.app",
  "pico.service",
  "pico.agent",
  "pico.skill",
  "pico.harness",
  "pico.capability",
  "pico.conversation",
  "pico.eval",
  "pico.binding",
  "pico.policy"
]);

export function validatePlatformManifest(manifest: PlatformManifest) {
  if (!supportedKinds.has(manifest.kind)) {
    throw new Error(`Unsupported manifest kind: ${manifest.kind}`);
  }

  if (!manifest.id) {
    throw new Error(`Manifest ${manifest.kind} must define id.`);
  }

  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    throw new Error(`Manifest ${manifest.id} must define a positive integer version.`);
  }

  return manifest;
}
