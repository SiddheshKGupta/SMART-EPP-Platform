# Smart EPP Design System

This file is the visual source of truth for new Smart EPP workspaces. Page-specific
files under `pages/` may refine it, but must not contradict the platform principles.

## Design read

Smart EPP is a regulated NBFC operations cockpit for high-frequency finance,
Sales Ops, business approvers, management, and auditors. It combines dense
institutional control with calm, precise, Apple-influenced interaction craft.

## Design dials

- Variance: 7/10. Asymmetric hierarchy where it improves orientation, not novelty.
- Motion: 4/10. Crisp state and spatial feedback only.
- Density: 8/10. Compact operational tables and inspectors with readable rhythm.

## Foundation

- Desktop-first enterprise product UI built from owned shadcn/Radix primitives.
- Light canvas with restrained translucent navigation and inspector layers.
- No marketing hero patterns, decorative bento grids, card sprawl, gradients,
  neon glows, or glass on every surface.
- Old onboarding and foreclosure prototypes are business references only.
- Numbers, identifiers, timestamps, and rates use the platform mono face.
- Colour never carries status by itself.

## Colour

| Role | Value | Use |
| --- | --- | --- |
| Deep navy | `#132A4F` | Structural navigation and high-authority actions |
| Primary blue | `#2457D6` | Selection, focus, links, and primary actions |
| Connect red | `#C83B3B` | Brand accent and genuine critical conditions only |
| Canvas | `#F6F8FB` | Application background |
| Surface | `#FFFFFF` | Primary working surfaces |
| Main text | `#182230` | Headings and operational content |
| Secondary text | `#667085` | Supporting metadata |
| Border | `#DDE3EA` | Dividers and input boundaries |
| Success | `#168A5B` | Approved, eligible, recovered, complete |
| Warning | `#C87912` | Attention, nearing SLA, review |
| Critical | `#C43C3C` | Blocked, rejected, overdue |
| Exception | `#6D55B5` | Authorised exception review |

Use semantic tokens in components. Do not introduce page-local foundational
hex values or a second accent system.

## Typography

- Interface: Geist Sans with system-ui fallback.
- Data: Geist Mono for identifiers, money, rates, dates, and audit timestamps.
- Page title: 24-28px with restrained negative tracking.
- Section title: 16-18px.
- Body and controls: 13-14px.
- Dense table metadata: 12-13px, never below 12px.
- Use weight, alignment, and proximity before increasing type size.

## Shape and material

- Working surfaces: 12px radius.
- Inputs and compact controls: 8px radius.
- Buttons and status badges may use a pill only when the interaction semantics
  benefit from a contained target.
- Use tinted, low-opacity shadows only for actual layer separation.
- Translucency is reserved for persistent chrome and parallel inspectors.
- Provide solid fallbacks for reduced transparency and stronger borders for
  increased contrast.

## Workspace pattern

```text
page identity + authority-aware actions
compact totals / control indicators
filter and view toolbar
primary dense table                 contextual inspector
```

- Tables are the main operating tool: sticky identifiers, useful sorting,
  saved/encoded filters, column visibility, bulk actions, and export.
- The inspector preserves list context. It becomes a Sheet on narrow screens.
- A record's rule evidence, source provenance, history, and next action remain
  adjacent in the inspector.
- Loading, empty, error, quarantine, and partial-success states are designed.
- Every KPI and total must drill into its underlying rows.

## Motion

- Do not animate tables, sorting, filtering, numbers, or bulk-result totals.
- Detail inspector entry and evidence expansion may animate with GSAP `fromTo`.
- Animate only transform and opacity, under 300ms, with a strong ease-out curve.
- Motion starts from the current presentation state and remains interruptible.
- No overshoot for operational UI.
- Reduced motion renders the final state immediately or uses a short cross-fade.
- Hover motion is gated to fine pointers. Press feedback is immediate and subtle.

## Accessibility and responsiveness

- WCAG AA contrast minimum; visible focus rings are mandatory.
- All icon-only controls have accessible names and tooltips where helpful.
- Keyboard users can reach filters, rows, actions, inspector, and close control
  in a predictable order. Focus returns to the originating row.
- Validate at 375px, 768px, 1024px, and 1440px.
- Desktop split workspaces collapse to one column or an accessible Sheet below
  the appropriate breakpoint. No accidental page-level horizontal scroll.

## Prohibited patterns

- Decorative gradients, glowing accents, generic equal-card dashboards.
- Nested cards, excessive shadows, and glassmorphism on data surfaces.
- Hardcoded OEM-specific visual or behavioural branches.
- Status shown by colour alone.
- `transition: all`, `ease-in`, `scale(0)`, layout-property animation, or motion
  without a reduced-motion path.
- Decorative or perpetual motion in high-frequency workflows.
- Fake metrics or real client identifiers in fixtures.

## Delivery checklist

- [ ] Role and maker-checker constraints are visible and enforced.
- [ ] Filters and deep links produce deterministic state.
- [ ] Table and inspector work with keyboard and narrow viewports.
- [ ] Source evidence and audit history are readable without leaving context.
- [ ] Colour, type, radius, and icon family match this system.
- [ ] Motion is justified, sub-300ms, GPU-only, and reduced-motion safe.
- [ ] Loading, empty, error, quarantine, and partial-success states exist.
- [ ] Lint, strict type-check, unit tests, E2E tests, and production build pass.
