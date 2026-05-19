# Neutrino Agent Guide

## Required Working Style
- Be a technically grounded partner. Evaluate tradeoffs instead of affirming a direction by default.
- Prefer the simplest solution that satisfies the current requirement.
- Do not introduce persistence, microservices, or generic abstraction layers unless there is a concrete second use case.
- Preserve clear runtime boundaries: `apps/*` own delivery concerns, `packages/schema` and `packages/ports` define ports, adapters stay behind those ports.

## Architecture Rules
- For any architecture-affecting change, update `architecture/contract.json` first, then regenerate `docs/architecture-canonical.md`.
- App and domain code must import schema, ports, and shared packages, never concrete infrastructure adapters directly.
- Infrastructure-specific behavior belongs in deployment/config layers, not in feature code.
- The API runtime must stay stateless and container-portable across Cloud Run and App Runner.

## Notion Collaboration Rules
- When the user asks about Notion documents or anything related to Notion, use the Notion connector. Only skip the connector when "notion" is plainly used as a generic English word rather than the product.
- The `Pico Agent Redux` Notion page is the collaborative product-direction workspace.
- `Product Vision Capture` is for human-facing product concept, product layers, MVP shape, and broad service needs. Treat it as fluid planning input, not repo ground truth.
- `Codex Repo Sync` is for agent-to-agent context exchange between Codex and ChatGPT. Treat it as a dated synchronization brief, but re-verify implementation facts from the repo before making code or architecture claims.
- Notion pages do not replace in-repo coding-agent documentation. Repo files remain authoritative for implementation, runtime contracts, validation, and current system behavior.
- When Notion direction becomes accepted, align repo documentation deliberately: update `docs/requirements-baseline.md` for requirements, update `architecture/contract.json` first for architecture-affecting changes, regenerate `docs/architecture-canonical.md`, and update other docs only where their ownership applies.
- Keep a clear distinction between product direction in Notion, accepted architecture in repo docs, and implemented behavior in code.

## Implementation Planning Docs
- Use `docs/implementation-roadmap.md` as the phase-by-phase implementation tracker and future-session handoff point.
- Use `docs/requirements-baseline.md` for accepted requirements, deferred requirements, constraints, and open implementation-plan questions.
- Use `docs/architecture-foundation.md` for rationale and decision history.
- Use `docs/platform-baseline.md` for the current platform baseline and first vertical milestone.
- Use `docs/deployment-baseline.md` for deployment, auth-domain, data-platform, and blob/artifact infrastructure assumptions.
- Ignore `docs/data-structure-ref/` for the current platform implementation-planning phase. Those files are reserved for later task, calendar, and generalized item data-structure design.
- The first implementation plan should center on the composable AI service-platform vertical path, not a standalone Agent Builder UI.

## Frontend Design System Rules
- `shadcn/ui` is the required component foundation for the project.
- Frontend work must use the shared design-system package and its tokens, primitives, and wrappers.
- Do not introduce another component library without explicit approval.
- Do not create page-specific spacing, color, typography, or radius systems. Extend shared tokens instead.
- Prefer composable primitives and semantic variants over one-off visual patches.
- Keep interfaces restrained: strong hierarchy, minimal chrome, and utility-first copy.

## Delivery Expectations
- Keep environment contracts explicit with runtime validation and documented variables.
- Maintain `/health` and `/readyz` endpoints for deployable services. `/healthz` may remain as compatibility alias but is not deployment-gating.
- Add or update tests for behavior changes when the surface is stable enough to test.
- Avoid over-engineering. Shipping a narrow, well-factored slice is better than building for hypothetical future breadth.

## Browser Verification Policy
- For web implementation review, use the Codex in-app browser (IAB) by default.
- If IAB is unavailable or blocked, use the system default browser as the fallback.
- Keep browser checks scoped to the target route/state and report what was verified.

## Token Burn Guardrails
- Follow `docs/token-guardrails.md` for token-budget behavior in this repo.
- Treat significant token burn as opt-in: if a requested or planned action meets any "significant burn" trigger, pause and ask for explicit approval before running it.
- Always explain why the action is expensive, what value it provides, and one cheaper alternative.
- Keep default exploration narrow: targeted file reads, bounded output, and no broad dumps unless explicitly approved.
