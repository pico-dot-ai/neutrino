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

const packageNamePattern = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/;
const serviceReferencePattern = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*@[^@\s]+$/;
const visibilityAccesses = new Set(["private", "internal", "customers", "public", "inherited"]);

function validatePackageName(packageName: string, label: string) {
  if (!packageNamePattern.test(packageName)) {
    throw new Error(`${label} must use package-style identity like @scope/name.`);
  }
}

function validateVisibilityRule(rule: { access: string }, label: string) {
  if (!visibilityAccesses.has(rule.access)) {
    throw new Error(`${label} visibility access must be private, internal, customers, public, or inherited.`);
  }
}

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

  if (manifest.kind === "pico.app") {
    if (!manifest.packageName) {
      throw new Error(`App manifest ${manifest.id} must define packageName.`);
    }
    validatePackageName(manifest.packageName, `App manifest ${manifest.id}`);
    if (manifest.visibility) {
      validateVisibilityRule(manifest.visibility, `App manifest ${manifest.id}`);
    }
    for (const [objectKey, object] of Object.entries(manifest.objects ?? {})) {
      if (!object.schema) {
        throw new Error(`App manifest ${manifest.id} object ${objectKey} must define schema.`);
      }
      if (object.visibility) {
        validateVisibilityRule(object.visibility, `App manifest ${manifest.id} object ${objectKey}`);
      }
    }
    for (const [actionKey, action] of Object.entries(manifest.actions ?? {})) {
      if (!action.handler && !action.uses) {
        throw new Error(`App manifest ${manifest.id} action ${actionKey} must define handler or uses.`);
      }
      if (action.uses && !serviceReferencePattern.test(action.uses)) {
        throw new Error(`App manifest ${manifest.id} action ${actionKey} uses must reference a versioned service like @scope/name@version.`);
      }
      if (action.visibility) {
        validateVisibilityRule(action.visibility, `App manifest ${manifest.id} action ${actionKey}`);
      }
    }
    for (const [viewKey, view] of Object.entries(manifest.views ?? {})) {
      if (!view.resource) {
        throw new Error(`App manifest ${manifest.id} view ${viewKey} must define resource.`);
      }
      if (view.visibility) {
        validateVisibilityRule(view.visibility, `App manifest ${manifest.id} view ${viewKey}`);
      }
    }
  }

  if (manifest.kind === "pico.service") {
    if (!manifest.packageName) {
      throw new Error(`Service manifest ${manifest.id} must define packageName.`);
    }
    validatePackageName(manifest.packageName, `Service manifest ${manifest.id}`);
    if (!manifest.schema?.input) {
      throw new Error(`Service manifest ${manifest.id} must define schema.input.`);
    }
    if (!manifest.schema?.output) {
      throw new Error(`Service manifest ${manifest.id} must define schema.output.`);
    }
    if (!manifest.policy) {
      throw new Error(`Service manifest ${manifest.id} must define policy.`);
    }
    if (!manifest.summary) {
      throw new Error(`Service manifest ${manifest.id} must define summary.`);
    }
  }

  return manifest;
}
