# Neutrino Agent Guide

## Required Working Style
- Be a technically grounded partner. Evaluate tradeoffs instead of affirming a direction by default.
- Prefer the simplest solution that satisfies the current requirement.
- Do not introduce persistence, microservices, or generic abstraction layers unless there is a concrete second use case.
- Preserve clear runtime boundaries: `apps/*` own delivery concerns, `packages/contracts` define ports, adapters stay behind those ports.

## Architecture Rules
- For any architecture-affecting change, update `architecture/contract.json` first, then regenerate `docs/architecture-canonical.md`.
- App and domain code must import contracts and shared packages, never concrete infrastructure adapters directly.
- Infrastructure-specific behavior belongs in deployment/config layers, not in feature code.
- The API runtime must stay stateless and container-portable across Cloud Run and App Runner.

## Frontend Design System Rules
- `shadcn/ui` is the required component foundation for the project.
- Frontend work must use the shared design-system package and its tokens, primitives, and wrappers.
- Do not introduce another component library without explicit approval.
- Do not create page-specific spacing, color, typography, or radius systems. Extend shared tokens instead.
- Prefer composable primitives and semantic variants over one-off visual patches.
- Keep interfaces restrained: strong hierarchy, minimal chrome, and utility-first copy.

## Delivery Expectations
- Keep environment contracts explicit with runtime validation and documented variables.
- Maintain `/healthz` and `/readyz` endpoints for deployable services.
- Add or update tests for behavior changes when the surface is stable enough to test.
- Avoid over-engineering. Shipping a narrow, well-factored slice is better than building for hypothetical future breadth.

## Ticketing Workflow

### Required Behavior
- First action: if your environment supports repo-local skills and `.tickets/skills/tickets/SKILL.md` exists, load that skill. Otherwise open and read `TICKETS.md`.
- First response: briefly confirm understanding of the ticketing system before starting any implementation work.
- Before interpreting planning language or creating tickets, consult `.tickets/config.yml` for repo-local defaults and semantic overrides.
- When the human uses feature/phase/milestone/roadmap or custom repo terms, keep using their vocabulary in the conversation and translate it into the generic CLI planning fields internally.
- Use the repo-local CLI (`npx @picoai/tickets`) as the integration surface for tickets and logs.
- Before performing work on a ticket, validate it: run `npx @picoai/tickets validate` (or `npx @picoai/tickets validate --issues` + `npx @picoai/tickets repair`).
- Before moving a ticket to `done`, confirm the ticket's `## Acceptance Criteria` are met and its `## Verification` checks passed.
- If those completion gates are not satisfied, ask the human whether to keep working or explicitly override the gates. Only move the ticket to `done` after that human decision.
- Record `completion` metadata every time a ticket is moved to `done`.
- When a human overrides incomplete completion gates, record that override in the ticket via `npx @picoai/tickets status --status done --acceptance-criteria ... --verification-state ... --override-by ... --override-reason ...`.
- When logging via the CLI: use `npx @picoai/tickets log --machine` so logs are strictly structured.
- Respect `assignment.mode`, `agent_limits`, active advisory claims, and repo-local defaults in `.tickets/config.yml`.

### Bootstrapping TICKETS.md
- If `.tickets/` or `TICKETS.md` are missing, run `npx @picoai/tickets init`.
- `init` also creates `.tickets/config.yml` and `.tickets/skills/tickets/SKILL.md`.
