import type { LanguageModelProvider, RunRepository, TraceRepository, UsageLedger } from "@neutrino/ports";
import type { ChatMessage, RunRecord, ScopeRef, TraceRecord, UsageRecord } from "@neutrino/schema";
import { devAgentHarnessManifest, devAgentManifest, devAgentAppManifest } from "../dev-agent/manifests";

export type DevAgentRuntimeRequest = {
  scope: ScopeRef;
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
      appId: devAgentAppManifest.id,
      agentId: devAgentManifest.id,
      harnessId: devAgentHarnessManifest.id,
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
