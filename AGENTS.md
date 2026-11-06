<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (VULNSHIELD)
- All scan data flows through `useScans()`; demo data lives only in `src/lib/demo-data.ts` and must render with a DEMO badge — keeps real vs simulated results distinguishable.
- Security score is always derived via `src/lib/scoring.ts` from findings, never hardcoded — avoids invented scores.
- Website checks must be passive, rate-limited and require an ownership/permission confirmation — ethical scope.
- Shared domain types live in `src/lib/types.ts` so demo and real scan data share one shape.
- Website audit runs as one server function per phase in `src/lib/audit.functions.ts`, each re-validating input, consent, rate limit and SSRF guard — phases are independently callable, so each must guard itself.
- Audit rules that turn observed data into findings live in pure `src/lib/audit/analyze.ts` (tested in `src/test/audit-rules.test.ts`); network code stays in `*.server.ts`.
- Checks the scanner cannot perform use status `unavailable` and are never scored — honesty over completeness.
- Every browser-side npm package must be listed in `optimizeDeps.include` in `vite.config.ts` — late dependency discovery reloads Vite mid-session and duplicates React, blanking the preview.
