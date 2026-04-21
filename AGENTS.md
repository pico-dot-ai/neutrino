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

## Browser Verification Policy
- For web implementation review, use the Codex in-app browser (IAB) by default.
- Do not use Playwright for visual verification unless the user explicitly asks for Playwright.
- If IAB is unavailable or blocked, use the system default browser as the fallback.
- Keep browser checks scoped to the target route/state and report what was verified.
