# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill
updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue

---

## 2026-07-29

### Observation 1: Green gates did not prove cross-master resolution integrity

**Status:** OPEN
**Date:** 2026-07-29
**Session context:** Reviewing a domain-heavy vertical slice after implementation and full automated gates.
**Skill:** superpowers:subagent-driven-development
**Type:** open-source
**Phase/Area:** Independent review after implementation

**Issue:** The implementation passed unit, browser, type, lint, and build gates, but
independent review still found candidate failures where related master constraints
were not resolved together and preview state could be mistaken for persisted state.

**Suggested improvement:** Require every domain-heavy task brief and reviewer prompt
to include adversarial cross-master fixtures, persisted-versus-preview assertions,
and failure-path verification for bulk commands before a task can pass review.

**Principle:** A green suite proves only its encoded model. Independent review should
challenge relationships between masters, state boundaries, and partial-failure paths.

### Observation 2: Graph builder backend selection must fail over to code-only mode

**Status:** OPEN
**Date:** 2026-07-29
**Session context:** Running a local knowledge-graph build through an installed codebase mapping skill.
**Skill:** graphify
**Type:** open-source
**Phase/Area:** Backend detection and extraction fallback

**Issue:** A bare graph build auto-selected an optional semantic backend whose Python
adapter was unavailable. The whole run exited even though deterministic AST extraction
required no backend and could still produce a useful code graph.

**Suggested improvement:** Before starting semantic extraction, verify the selected
adapter import. If it is unavailable, continue automatically in disclosed code-only
mode and leave semantic files unstamped for a later retry.

**Principle:** Optional semantic enrichment must not block deterministic local analysis;
degrade explicitly and preserve retryability.
