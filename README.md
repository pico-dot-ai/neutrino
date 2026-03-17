# neutrino
Concise, Readable, Insightful

Neutrino is built for the age of AI + humans, turning documents into shared context both people and models can act on.

See the initial architecture and deployment decision framework:
- `docs/architecture-foundation.md`
- `architecture/contract.json` (single source of truth)
- `docs/architecture-canonical.md` (generated from contract)

Architecture governance commands:
- `node scripts/render-architecture-doc.mjs`
- `node scripts/check-architecture-drift.mjs`
