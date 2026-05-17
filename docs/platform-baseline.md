# Platform Baseline

Current Starter Version UUID: `019db1ca-803d-71f7-be40-37c122ed5700`

## Purpose
This document tracks the internal Neutrino platform baseline and the exact `pico-app-container` starter snapshot that app developers should use.

## Starter Version Mapping Policy
- The UUID in this file must match:
  - `pico-app-container/VERSION.uuid`
  - `pico-app-container/README.md`
- If `pico-app-container/` changes, generate a new UUIDv7 and update all three locations in the same PR.
- CI enforces this synchronization.

## Platform Baseline (v1)
- Internal API-first platform keyed by `pico_app_id`
- App registration + OAuth management in Neutrino admin console
- Internal-only provider capabilities
- Session-gated admin console and debug tooling
- Independent app repo deploy ownership (frontend + backend)
