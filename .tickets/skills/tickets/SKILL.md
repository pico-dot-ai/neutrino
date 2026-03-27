# tickets

This repo skill mirrors the canonical ticketing workflow in `TICKETS.md`.
Use it when your environment supports repo-local skills. In all cases, use `npx @picoai/tickets` as the only state-changing interface.

## Required behavior
- Read `TICKETS.md` for the full repo contract when context is missing.
- Consult `.tickets/config.yml` for repo-local defaults and semantic overrides before interpreting planning terminology or creating new tickets.
- Validate assigned tickets before implementation with `npx @picoai/tickets validate`.
- Before setting a ticket to `done`, confirm the ticket's `## Acceptance Criteria` are met and its `## Verification` checks passed.
- If those completion gates are not satisfied, stop and ask a human whether to keep working or explicitly override the gates. Only move the ticket to `done` after that human decision.
- Record `completion` metadata every time a ticket is moved to `done`.
- When a human overrides incomplete completion gates, record the exception through `npx @picoai/tickets status --status done --acceptance-criteria ... --verification-state ... --override-by ... --override-reason ...` so `ticket.md` and the status log both reflect it.
- Use `npx @picoai/tickets status`, `log`, `claim`, `plan`, and `graph` instead of editing derived state manually.
- When humans use terms like feature, phase, milestone, roadmap, or repo-specific equivalents, translate them through `.tickets/config.yml` and then call the generic CLI fields.
- Respect repo overrides in `.tickets/config.yml` and any narrative guidance in `TICKETS.override.md` if present.

## Core planning model
- `planning.node_type`: `work`, `group`, or `checkpoint`.
- `planning.group_ids`: group membership edges.
- `planning.precedes`: sequencing edges, separate from hard `dependencies`.
- `planning.lane`, `planning.rank`, and `planning.horizon`: generic ordering and roadmap dimensions.
- `resolution`: terminal work outcome (`completed`, `merged`, `dropped`).

## Default semantic mapping
- `feature` -> `planning.node_type` = `group`. A feature is modeled as a group node containing related work.
- `phase` -> `planning.lane`. A phase is modeled as a lane value that orders work at a coarse level.
- `milestone` -> `planning.node_type` = `checkpoint`. A milestone is modeled as a checkpoint node with derived completion.
- `roadmap` -> `planning.horizon`. A roadmap is modeled as a horizon value across groups and checkpoints.

Repo-specific semantic overrides live in `.tickets/config.yml`. Treat the list above as defaults only.

## Claims
- Claims are optional advisory leases stored in ticket logs.
- Acquire or renew with `npx @picoai/tickets claim --ticket <id>`.
- Release with `npx @picoai/tickets claim --ticket <id> --release`.
- Default claim TTL is 60 minutes unless the repo config overrides it.

## Planning views
- Use `npx @picoai/tickets list` for broad queue/reporting views.
- Use `npx @picoai/tickets plan` for operational state: ready, in-progress, blocked, and group rollups.
- Use `npx @picoai/tickets graph` for structural relationships, not execution state.
