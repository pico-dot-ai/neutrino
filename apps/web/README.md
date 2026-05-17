# Web App

Next.js App Router frontend intended for Vercel.

Rules:
- uses the shared design system from `packages/ui`
- public landing and form-based login at `/` and `/login`
- app admin console at `/admin` with debug chat at `/admin/debug/chat`
- proxies platform/control-plane requests through `/api/platform/*`
- must not import provider adapters directly
