# Task 5 report — unified capability navigation

## Delivered

- Added the registry-backed `CapabilitySidebar` with all 15 platform capabilities, an isolated final Admin group, active-page state, and an explicit accessible collapse control. Collapsed links remain in the DOM with their accessible names and Lucide-backed tooltips.
- Unified the shell so the capability sidebar and module navigation are present on every route, including Subvention. The legacy standalone Subvention state and selector are removed; skip-link and route-heading focus management remain intact.
- Reworked module navigation from `PLATFORM_MODULES`, retaining explicit mappings for the Subvention paths already implemented.
- Reworked the command bar from the registry and added the labeled controls: Start Demo Journey, Work queue, Alerts, and Integration health. Profile selection is sourced from `PlatformProvider` and changes the active profile only; it does not filter navigation.
- Added `tests/e2e/platform-navigation.spec.ts`. The Employees assertion verifies its `/employees` contract only; rendering remains Task 6 scope.

## Design decision statement

- **Design decision supported:** a single compact capability shell for regulated operating work, removing fragmented module access without obscuring Subvention.
- **Constitution sections applied:** Enterprise Structured, Data-Dense Operational, Financial Trust, navigation, accessibility, responsive behaviour, and prohibited-pattern guidance.
- **Specialist capability used:** `frontend-implementation`, informed by the approved Smart EPP `MASTER.md` and Design Intelligence Constitution.
- **Patterns adopted:** light neutral workspace layers, deep-navy structural navigation, blue selection/focus, 13–14px compact controls, hairline separation, registry-derived destinations, and a separated administrative group.
- **Patterns rejected:** gradients, glass, dark workspace canvas, card sprawl, generic AI motifs, a second icon family, foundational page-local colours, and role-based module hiding.
- **Accessibility impact:** semantic named navigation, `aria-current` on active capability/submodule links, icon-plus-tooltip collapsed navigation with labels preserved in the accessibility tree, visible focus tokens, retained skip link, and retained client-route heading focus.

## Verification

- RED attempted first with `npx.cmd playwright test tests/e2e/platform-navigation.spec.ts`; startup did not complete within the bounded 120-second environment window, so no browser assertion result was available.
- Direct TypeScript checking (`node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`) reached compilation. It is blocked by pre-existing missing declarations for `next`/`next/link`/`next/navigation`, including existing app files; the changed shell files show only those same declaration failures and no task-specific TypeScript diagnostic.
- Deterministic static checks passed: `git diff --check`; no `data-standalone-subvention` selector or attribute remains.
- Focused platform unit regressions completed successfully: 4 files and 20 tests passed. Vitest did not exit after results, so the bounded runner was terminated after output; it also emitted Vite's existing CJS Node API deprecation warning.
- Focused runtime E2E remains blocked by the bounded local server startup.
