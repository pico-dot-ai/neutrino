import type {
  PicoAgentManifest,
  PicoAppManifest,
  PicoBindingManifest,
  PicoHarnessManifest,
  PicoServiceManifest,
  PicoSkillManifest
} from "@neutrino/schema";

export const devAgentAppManifest: PicoAppManifest = {
  kind: "pico.app",
  version: 1,
  id: "pico.dev-agent",
  packageName: "@pico/dev-agent",
  name: "Dev agent",
  publisher: {
    orgId: "pico"
  },
  visibility: {
    access: "internal"
  },
  objects: {
    conversation: {
      schema: "./schemas/conversation.json",
      view: "ui://pico/dev-agent/conversation",
      visibility: {
        access: "inherited"
      }
    }
  },
  actions: {
    generate_reply: {
      input: "./schemas/generate-reply.input.json",
      output: "./schemas/generate-reply.output.json",
      mutates: ["conversation"],
      handler: "./actions/generate-reply.ts",
      uses: "@pico/dev-agent-service@1.0.0",
      visibility: {
        access: "inherited"
      }
    }
  },
  views: {
    conversation: {
      resource: "ui://pico/dev-agent/conversation",
      visibility: {
        access: "inherited"
      }
    }
  },
  requires: {
    services: {
      languageModel: "LanguageModelProvider",
      harness: "DevAgentHarness"
    }
  },
  agents: ["pico.dev-agent.agent"],
  harnesses: ["pico.dev-agent.harness"]
};

export const devAgentServiceManifest: PicoServiceManifest = {
  kind: "pico.service",
  version: 1,
  id: "pico.service.dev-agent",
  packageName: "@pico/dev-agent-service",
  name: "Dev agent service",
  summary: "Generates repo-grounded Dev Agent responses for a project conversation.",
  schema: {
    input: "./schemas/generate-reply.input.json",
    output: "./schemas/generate-reply.output.json"
  },
  policy: {
    visibility: "internal",
    requires: ["conversation:read", "conversation:write"],
    audit: "required"
  },
  uses: {
    tools: ["@pico/model-provider"]
  },
  follows: {
    skills: ["@pico/repo-context"]
  },
  records: {
    emit: ["execution.started", "model.called", "execution.completed"]
  },
  "interface": {
    functions: [
      {
        name: "generate_reply",
        input: "./schemas/generate-reply.input.json",
        output: "./schemas/generate-reply.output.json"
      }
    ]
  },
  contract: "DevAgentService",
  ownerAppId: devAgentAppManifest.id,
  capabilities: ["pico.capability.dev-agent.generate"]
};

export const devAgentSkillManifest: PicoSkillManifest = {
  kind: "pico.skill",
  version: 1,
  id: "pico.skill.repo-context",
  name: "Repository context",
  description: "Collects repo-grounded context before the Dev agent executes."
};

export const devAgentHarnessManifest: PicoHarnessManifest = {
  kind: "pico.harness",
  version: 1,
  id: "pico.dev-agent.harness",
  name: "Dev agent harness",
  runtime: {
    type: "conversation",
    timeoutSeconds: 60,
    concurrency: 1
  },
  mounts: {
    skills: [devAgentSkillManifest.id],
    capabilities: ["pico.capability.dev-agent.generate"]
  },
  permissions: {
    dataScope: "project"
  },
  observability: {
    traces: true,
    toolCalls: true,
    costTracking: true,
    runHistory: true
  },
  evals: ["pico.eval.dev-agent.basic-output"]
};

export const devAgentManifest: PicoAgentManifest = {
  kind: "pico.agent",
  version: 1,
  id: "pico.dev-agent.agent",
  name: "Dev agent",
  owner: {
    scope: "project",
    ref: "current"
  },
  model: {
    contract: "LanguageModelProvider",
    profile: "dev-agent-default"
  },
  skills: [devAgentSkillManifest.id],
  harness: devAgentHarnessManifest.id,
  memory: {
    scope: "project"
  },
  permissions: {
    requestedCapabilities: ["pico.capability.dev-agent.generate"]
  }
};

export const devAgentLocalBindingManifest: PicoBindingManifest = {
  kind: "pico.binding",
  version: 1,
  id: "pico.binding.dev-agent.local",
  name: "Dev agent local bindings",
  environment: "local",
  bindings: {
    languageModel: {
      provider: "openai",
      model: "gpt-5.2"
    },
    devAgentService: {
      provider: "core",
      serviceId: devAgentServiceManifest.id,
      capabilityId: "pico.capability.dev-agent.generate"
    }
  }
};
