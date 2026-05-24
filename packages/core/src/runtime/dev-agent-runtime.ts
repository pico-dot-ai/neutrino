import type { LanguageModelProvider, RunRepository, TraceRepository, UsageLedger } from "@neutrino/ports";
import type { ChatMessage, RunRecord, ScopeRef, StreamEvent, TraceRecord, UsageRecord } from "@neutrino/schema";

export type DevAgentRuntimeRequest = {
  scope: ScopeRef;
  appId: string;
  actionId?: string;
  actorId?: string;
  servicePackageName?: string;
  serviceVersion?: number;
  schemaVersions?: Record<string, string>;
  agentId: string;
  harnessId: string;
  conversationId: string;
  messages: ChatMessage[];
  model: string;
};

export type DevAgentRuntimeResult = {
  run: RunRecord;
  traces: TraceRecord[];
};

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export class DevAgentRuntime {
  constructor(
    private readonly options: {
      languageModelProvider: LanguageModelProvider;
      runRepository: RunRepository;
      traceRepository: TraceRepository;
      usageLedger: UsageLedger;
    }
  ) {}

  async run(request: DevAgentRuntimeRequest): Promise<DevAgentRuntimeResult> {
    const runId = randomId("run");
    const startedAt = nowIso();
    const baseRun: RunRecord = {
      runId,
      scope: request.scope,
      appId: request.appId,
      actionId: request.actionId ?? "generate_reply",
      actorId: request.actorId ?? "actor_system",
      servicePackageName: request.servicePackageName ?? "@pico/dev-agent-service",
      serviceVersion: request.serviceVersion ?? 1,
      schemaVersions: request.schemaVersions ?? {},
      agentId: request.agentId,
      harnessId: request.harnessId,
      conversationId: request.conversationId,
      status: "running",
      startedAt
    };

    await this.options.runRepository.createRun(baseRun);
    await this.trace(runId, "runtime.started", "Dev agent runtime started.", {
      appId: baseRun.appId,
      agentId: baseRun.agentId,
      harnessId: baseRun.harnessId
    });

    try {
      const response = await this.options.languageModelProvider.generate({
        model: request.model,
        messages: request.messages
      });

      await this.trace(runId, "language_model.completed", "Language model generation completed.", {
        model: request.model
      });

      const completed: RunRecord = {
        ...baseRun,
        status: "succeeded",
        output: response.content,
        completedAt: nowIso()
      };
      await this.options.runRepository.updateRun(completed);

      const usage: UsageRecord = {
        usageId: randomId("usage"),
        scope: request.scope,
        runId,
        provider: "language-model",
        model: request.model,
        createdAt: nowIso()
      };
      await this.options.usageLedger.recordUsage(usage);

      return {
        run: completed,
        traces: await this.options.traceRepository.listTraces(runId)
      };
    } catch (error) {
      const failed: RunRecord = {
        ...baseRun,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown runtime error.",
        completedAt: nowIso()
      };
      await this.options.runRepository.updateRun(failed);
      await this.trace(runId, "runtime.failed", failed.error ?? "Runtime failed.");
      return {
        run: failed,
        traces: await this.options.traceRepository.listTraces(runId)
      };
    }
  }

  async *stream(request: DevAgentRuntimeRequest): AsyncIterable<StreamEvent> {
    const runId = randomId("run");
    const startedAt = nowIso();
    const baseRun: RunRecord = {
      runId,
      scope: request.scope,
      appId: request.appId,
      actionId: request.actionId ?? "generate_reply",
      actorId: request.actorId ?? "actor_system",
      servicePackageName: request.servicePackageName ?? "@pico/dev-agent-service",
      serviceVersion: request.serviceVersion ?? 1,
      schemaVersions: request.schemaVersions ?? {},
      agentId: request.agentId,
      harnessId: request.harnessId,
      conversationId: request.conversationId,
      status: "running",
      startedAt
    };

    await this.options.runRepository.createRun(baseRun);
    await this.trace(runId, "runtime.started", "Dev agent runtime started.", {
      appId: baseRun.appId,
      agentId: baseRun.agentId,
      harnessId: baseRun.harnessId
    });

    let finalText = "";
    let sawDone = false;

    try {
      for await (const event of this.options.languageModelProvider.stream({
        model: request.model,
        messages: request.messages
      })) {
        if (event.type === "delta") {
          finalText += event.text;
          yield event;
        } else if (event.type === "done") {
          finalText = event.text;
          sawDone = true;
          yield event;
        } else {
          yield event;
        }
      }

      await this.trace(runId, "language_model.completed", "Language model generation completed.", {
        model: request.model
      });

      const completed: RunRecord = {
        ...baseRun,
        status: "succeeded",
        output: finalText,
        completedAt: nowIso()
      };
      await this.options.runRepository.updateRun(completed);
      await this.options.usageLedger.recordUsage({
        usageId: randomId("usage"),
        scope: request.scope,
        runId,
        provider: "language-model",
        model: request.model,
        createdAt: nowIso()
      });

      if (!sawDone) {
        yield {
          type: "done",
          text: finalText
        };
      }
    } catch (error) {
      const failed: RunRecord = {
        ...baseRun,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown runtime error.",
        completedAt: nowIso()
      };
      await this.options.runRepository.updateRun(failed);
      await this.trace(runId, "runtime.failed", failed.error ?? "Runtime failed.");
      yield {
        type: "error",
        message: failed.error ?? "Runtime failed."
      };
    }
  }

  private async trace(
    runId: string,
    eventType: string,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    await this.options.traceRepository.appendTrace({
      traceId: randomId("trace"),
      runId,
      eventType,
      message,
      metadata,
      createdAt: nowIso()
    });
  }
}
