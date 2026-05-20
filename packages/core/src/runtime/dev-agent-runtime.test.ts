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
        tenantId: "tenant_1",
        projectId: "project_1"
      },
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
        tenantId: "tenant_1",
        projectId: "project_1"
      },
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
});
