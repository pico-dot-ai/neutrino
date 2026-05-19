# Token Guardrails

This file defines repo-level rules to avoid accidental high token burn.
Default posture: use low-cost operations first, and require explicit approval before expensive operations.

## Goals
- Keep normal implementation work fast and cost-efficient.
- Make significant token spend an explicit tradeoff, not a silent side effect.
- Keep policy tunable through normal repo commits.

## Normal vs Significant Burn

Normal or moderate work does **not** require approval:
- Reading specific files or small groups of files.
- Narrow `rg` searches scoped to likely paths.
- Running targeted tests for changed components.
- Short command outputs needed to complete the task.

Significant burn **does** require approval before execution.
Any one trigger is enough:
- Expected command output over ~600 lines or ~25k characters.
- Repository-wide scans likely to return large output (for example broad `rg` over root without path filters).
- Reading large generated artifacts or logs:
  - `.next/`, coverage outputs, large JSON/JSONL, SQLite dumps, telemetry/log databases.
- Repeated broad inspection loops after the same result pattern is already known.
- Any workflow expected to add >1.5M tokens in one thread segment.

## Required Approval Flow (Significant Burn)
Before running a significant-burn action, provide:
1. What will be run.
2. Why it is expensive.
3. Why it is needed now.
4. One cheaper alternative.
5. Expected output size class (`medium`, `large`, `very large`).

Approval must be explicit in the user reply before execution.

## Mandatory Explanation Standard
When a significant-burn action is approved and executed, report:
- What was run.
- What was learned.
- Whether the same result could be reused to avoid repeating the cost.

When a significant-burn action is not approved, continue with the best cheaper path.

## Operational Defaults
- Prefer bounded commands (`head`, `tail`, scoped `sed`, targeted `rg` paths).
- Prefer summaries over raw dumps.
- Do not print entire large files when a narrow excerpt answers the question.
- Cache decisions in repo docs when useful so future sessions can skip rediscovery.

## Tuneable Thresholds
These thresholds are policy knobs and can be adjusted by commit:
- `SIGNIFICANT_OUTPUT_LINES`: 600
- `SIGNIFICANT_OUTPUT_CHARS`: 25000
- `SIGNIFICANT_THREAD_TOKENS`: 1500000

If these thresholds change, update this file and reference the change in PR/commit notes.
