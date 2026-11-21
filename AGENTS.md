# MAXDRIVE — notes for coding agents

<!-- BEGIN:nextjs-agent-rules -->
## This project runs Next.js 16

APIs and conventions differ from older Next.js versions. Before writing Next.js code,
read the version-matched docs bundled at `node_modules/next/dist/docs/`.

Key conventions used here:
- `src/proxy.ts` (not `middleware.ts`) — Node.js runtime, optimistic auth redirect only.
- `params` / `searchParams` / `cookies()` / `headers()` are async.
- `revalidateTag(tag, profile)` needs two args; prefer `revalidatePath` / `updateTag` in actions.
- No `next lint` — run `npm run lint` (ESLint flat config).
<!-- END:nextjs-agent-rules -->

## Project rules
- Plan & progress: `docs/MAXDRIVE_REFACTOR_PLAN.md`.
- Every mutating server action calls `requireCan(permission)` / `requireUser()` from `src/shared/authz/can.ts` first.
- Server-only logic that must not be network-callable goes in a module WITHOUT `"use server"` (e.g. `sales/server/core.ts`).
- Stock changes only through `applyStockChange()` (`features/admin/inventory/server/stock.ts`).
- UI uses the Horizon design tokens in `src/app/globals.css` — no hard-coded colours.
