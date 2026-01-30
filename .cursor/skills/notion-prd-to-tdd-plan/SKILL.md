---
name: notion-prd-to-tdd-plan
description: Reads PRD pages from the team's Notion database and turns them into implementation plans plus TDD-focused task lists that can be executed via the tdd-automation subagent. Use when the user references a Notion PRD URL or asks to plan work from the shared PRD database.
---

# Notion PRD → TDD Plan

Turn Notion PRDs from the shared database into concrete implementation plans and TDD-friendly task lists, ready to hand off to the `tdd-automation` subagent.

The primary PRD database lives at:

- `https://www.notion.so/yunwestc/2f53f023b5cc806e86cbff11700efd17?v=2f53f023b5cc80289ebe000c8f1f5f79`

Use this skill whenever the user runs `/create-skill <notion-prd-url>` or otherwise points to a PRD in that database.

## Quick Start

When given a Notion PRD (either the database URL above plus a title, or a direct page URL):

1. **Open PRD in Notion**
   - Use the browser/Notion tools (e.g. `cursor-browser-extension`) or `WebFetch` to load the PRD content.
   - If only the database URL is provided, search within that database by PRD title or filters mentioned by the user.
2. **Understand the PRD**
   - Extract: goals, user problems, scope, non-goals, key flows, constraints, success metrics.
3. **Create an implementation plan**
   - Break the PRD into features/epics, then into concrete engineering deliverables (backend, frontend, infra, data, etc.).
   - Capture assumptions and open questions explicitly.
4. **Generate TDD-oriented tasks**
   - For each deliverable, define a small sequence of tasks that follow the TDD cycle (write failing test → minimal implementation → refactor).
5. **Prepare for `tdd-automation`**
   - Group tasks into chunks that the `tdd-automation` subagent can execute one-by-one.
   - Include enough context (spec snippets, APIs, files) for each chunk so it can apply strict TDD.

## Workflow

### Step 1: Identify and fetch the PRD

1. **Identify the PRD source**
   - If the user passes the **database URL only**, ask (once) which PRD entry to use: by title, status, or ID.
   - If the user passes a **specific PRD page URL**, use that directly.
2. **Fetch the content**
   - Prefer the browser/Notion tooling for rich pages:
     - Use the `cursor-browser-extension` (or equivalent) to open the URL.
     - Scroll if necessary and capture all relevant text sections.
   - If browser tools are not available, fall back to `WebFetch` and parse the markdown/HTML.
3. **Extract structure**
   - Look for common PRD sections: Overview, Problem, Goals, Non-goals, Requirements, UX flows, Open Questions, FAQs.
   - Normalize into a structured internal summary:
     - **Context**
     - **Goals / Success metrics**
     - **Key user journeys**
     - **Functional requirements**
     - **Non-functional requirements**
     - **Constraints / Risks**
     - **Open questions**

Keep this internal summary short but precise; it will be the base for the implementation plan.

### Step 2: Build the implementation plan

Produce a single markdown implementation plan that:

- Starts with a **1-paragraph executive summary**.
- Lists **scoped, testable features** (each one independently shippable if possible).
- Separates concerns by layer where helpful:
  - Backend / APIs
  - Frontend / UI
  - Data / storage
  - Integrations
  - Infra / observability
- For each feature, captures:
  - **Description** (what changes for the user)
  - **Acceptance criteria** (testable outcomes)
  - **Dependencies** (other features, external systems)
  - **Risks / edge cases**

**Plan template (use as a base):**

```markdown
# [Feature/Project] Implementation Plan

## Executive Summary
- [1–3 bullet points summarizing what will be built and why]

## Context & Goals
- **Problem**: [...]
- **Goals**: [...]
- **Non-goals**: [...]
- **Key metrics**: [...]

## High-level Design
- **Architecture**: [brief overview]
- **Key components**: [list with 1–2 lines each]

## Feature Breakdown

### [Feature A]
- **User impact**: [...]
- **Acceptance criteria**:
  - [ ]
  - [ ]
- **Dependencies**: [...]
- **Risks / Edge cases**: [...]

### [Feature B]
...

## Testing & Rollout
- **Testing strategy**: [unit, integration, e2e, manual checks]
- **Rollout plan**: [feature flags, stages, monitoring, rollback]
```

### Step 3: Derive TDD-oriented tasks from the plan

For each feature in the implementation plan, break work down into **small, TDD-sized tasks**.

Each task (or small group of tasks) must:

- Describe the **behavior** to test, not just the code location.
- Specify:
  - Expected input/output or state change.
  - Relevant files/modules (if known).
  - Edge cases or error conditions.
  - How to verify the test fails first.

**Task format aimed at `tdd-automation`:**

```markdown
### Task [N]: [Short behavior-focused title]

- **Goal (behavior)**: [what the system should do]
- **Related PRD section**: ["Requirements → API", etc.]
- **Test scope**: [unit / integration / e2e]
- **Suggested test file(s)**: [`backend/tests/test_x.py`, `frontend/__tests__/y.test.tsx`, etc.]
- **TDD steps**:
  1. Write failing test that asserts: [...]
  2. Run tests and confirm failure reason matches missing behavior.
  3. Implement minimal code in: [...]
  4. Re-run tests, ensure all pass.
  5. Refactor if needed, keeping tests green.
```

Try to keep each task feasible within 1–2 hours of focused work.

### Step 4: Organize tasks for `tdd-automation`

Group tasks into logical sequences that the `tdd-automation` subagent can run one at a time.

Organize as:

- **Phase 1 – Skeleton & contracts**
  - Tasks for API contracts, data models, or core domain rules.
- **Phase 2 – Happy-path flows**
  - Tasks for main user journeys.
- **Phase 3 – Edge cases & errors**
  - Tasks for validation, error handling, and negative paths.
- **Phase 4 – Observability & cleanup**
  - Tasks for logging, metrics, and refactors.

At the end, you should have:

1. A **single implementation plan**.
2. A **numbered TDD-task list**, grouped by phase.

Both will be used as context when invoking `tdd-automation`.

### Step 5: Hand-off to `tdd-automation`

When the plan and tasks are ready, prepare a prompt suitable for the `tdd-automation` subagent.

**Example structure (for internal use when calling `Task` with `subagent_type="tdd-automation"`):**

```markdown
Context:
- Project: [name]
- PRD source: [Notion URL]
- Summary: [2–3 line summary]

Implementation plan:
- [paste condensed version or link if long]

TDD task to execute now:
- [paste one specific Task N block from the task list]

Constraints:
- Follow strict TDD from the `test-driven-development` skill.
- Do not write production code before a failing test exists.
- Keep each iteration minimal (one behavior per cycle).
```

Only one concrete task should be active per `tdd-automation` invocation. After a task is completed, move to the next task in the list.

## Examples

### Example 1: Simple API feature

Given a PRD describing "Add GET /projects/{id} endpoint":

1. Extract requirements:
   - Return project details by ID.
   - 404 for unknown IDs.
   - 401 for unauthenticated users.
2. Implementation plan:
   - Backend: new route, service method, repository query.
   - Tests: unit tests for service, integration tests for route.
3. TDD tasks:
   - Task 1: "Authenticated user can fetch existing project".
   - Task 2: "Unknown project ID returns 404".
   - Task 3: "Unauthenticated request returns 401".

### Example 2: UI flow

For a PRD describing "Drawing upload and KCL generation UI", derive:

1. Features:
   - Upload drawing file.
   - Show parsing progress and errors.
   - Display generated KCL output.
2. Tasks:
   - Backend parsing tests first, then implementation.
   - Frontend component tests around upload, loading state, and error display.

Keep examples brief and behavior-focused; always drive tasks from the PRD requirements.

