import { describe, expect, it } from "vitest";
import type { LanguageModelProvider } from "@neutrino/ports";
import { createInMemoryCoreRepositories } from "../repositories/in-memory-core-repositories";
import { DevAgentRuntime } from "./dev-agent-runtime";

const fakeLanguageModelProvider: LanguageModelProvider = {
  async generate(request) {
    return {
      content: `generated with ${request.model}`
    };
  },
  async *stream() {
    yield {
      type: "done",
      text: "generated"
    };
  }
};

const failingLanguageModelProvider: LanguageModelProvider = {
  async generate() {
    throw new Error("Model provider failed.");
  },
  async *stream() {
    throw new Error("Model provider failed.");
  }
};

describe("DevAgentRuntime", () => {
  it("persists run, trace, and usage records", async () => {
    const core = createInMemoryCoreRepositories();
    const runtime = new DevAgentRuntime({
      languageModelProvider: fakeLanguageModelProvider,
      runRepository: core.runRepository,
      traceRepository: core.traceRepository,
      usageLedger: core.usageLedger
    });

    const result = await runtime.run({
      scope: {
        workspaceId: "workspace_1",
        projectId: "project_1"
      },
      appId: "pico.dev-agent",
      agentId: "pico.dev-agent.agent",
      harnessId: "pico.dev-agent.harness",
      conversationId: "conversation_1",
      model: "gpt-test",
      messages: [
        {
          role: "user",
          content: "Write a test response."
        }
      ]
    });

    expect(result.run.status).toBe("succeeded");
    expect(result.run.output).toBe("generated with gpt-test");
    expect(result.traces.map((trace) => trace.eventType)).toContain("runtime.started");
    await expect(core.usageLedger.listUsage()).resolves.toHaveLength(1);
  });

  it("streams provider events while persisting runtime records", async () => {
    const core = createInMemoryCoreRepositories();
    const runtime = new DevAgentRuntime({
      languageModelProvider: fakeLanguageModelProvider,
      runRepository: core.runRepository,
      traceRepository: core.traceRepository,
      usageLedger: core.usageLedger
    });

    const events = [];
    for await (const event of runtime.stream({
      scope: {
        workspaceId: "workspace_1",
        projectId: "project_1"
      },
      appId: "pico.dev-agent",
      agentId: "pico.dev-agent.agent",
      harnessId: "pico.dev-agent.harness",
      conversationId: "conversation_1",
      model: "gpt-test",
      messages: [
        {
          role: "user",
          content: "Write a test response."
        }
      ]
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: "done",
        text: "generated"
      }
    ]);
    await expect(core.runRepository.listRuns()).resolves.toMatchObject([
      {
        status: "succeeded",
        output: "generated"
      }
    ]);
    await expect(core.usageLedger.listUsage()).resolves.toHaveLength(1);
  });

  it("records failed runs and runtime.failed trace entries", async () => {
    const core = createInMemoryCoreRepositories();
    const runtime = new DevAgentRuntime({
      languageModelProvider: failingLanguageModelProvider,
      runRepository: core.runRepository,
      traceRepository: core.traceRepository,
      usageLedger: core.usageLedger
    });

    const result = await runtime.run({
      scope: {
        workspaceId: "workspace_1",
        projectId: "project_1"
      },
      appId: "pico.dev-agent",
      agentId: "pico.dev-agent.agent",
      harnessId: "pico.dev-agent.harness",
      conversationId: "conversation_1",
      model: "gpt-test",
      messages: [
        {
          role: "user",
          content: "Write a test response."
        }
      ]
    });

    expect(result.run.status).toBe("failed");
    expect(result.run.error).toBe("Model provider failed.");
    expect(result.traces.map((trace) => trace.eventType)).toContain("runtime.failed");
  });
});
