# Implementation Plan: code.html Buttons and Functions (TDD)

**Status**: In Progress  
**Started**: 2025-01-30  
**Last Updated**: 2025-01-30  
**Estimated Completion**: TBD  

---

**CRITICAL INSTRUCTIONS**: After completing each phase:
1. Check off completed task checkboxes
2. Run all quality gate validation commands
3. Verify ALL quality gate items pass
4. Update "Last Updated" date above
5. Document learnings in Notes section
6. Only then proceed to next phase

**DO NOT skip quality gates or proceed with failing checks**

---

## Overview

### Feature Description
[code.html](code.html) is a static "Architect AI" 3D workspace UI. All buttons and links are non-functional (no JavaScript). This plan adds **interactive behavior** to every button and key input using **test-driven development**: tests first, then minimal implementation, then refactor.

### Buttons and Functions to Implement

| Area | Element | Intended function |
|------|--------|--------------------|
| **Header** | File / Edit / Modify / Render / Window | Menu open/close or stub (e.g. console / placeholder) |
| **Header** | Design / Simulate / Animate | Mode toggle: single active mode, update DOM (active class) |
| **Header** | Export Project | Trigger export flow (stub: e.g. alert or console) |
| **Header** | Notifications / Account | Placeholder (e.g. toggle panel or stub) |
| **Left sidebar** | Home, Project Explorer, 3D Assets, Layers, Marketplace, Settings | Active pane state: one active, update active class on buttons |
| **Project tree** | Chair_Prototype_v1, Meshes, Materials, Lighting_Setup | Expand/collapse; item click selects (update selection state + DOM) |
| **Viewport toolbar** | Select, Move, Rotate, Scale, Grid, Camera | Tool selection: one active tool, update DOM |
| **Viewport bottom** | Viewport / Wireframe / Node Editor / UV Map | Tab switch: one active tab, show/hide or attribute for content |
| **AI panel** | Chat, Close | Toggle panel visibility or placeholder |
| **AI panel** | Image, Mic, Send | Image: stub; Mic: stub; Send: submit textarea, add user message to chat DOM |
| **AI panel** | Textarea, ⌘+K | Enter or Send submits; ⌘+K opens command palette (stub or minimal UI) |

### Success Criteria
- [ ] Every listed button/link has a wired handler (no dead clicks).
- [ ] Mode (Design/Simulate/Animate), viewport tool, viewport tab, and sidebar pane state are consistent and reflected in DOM.
- [ ] AI input: submit adds a user message to the chat area; Send and ⌘+K behave as specified.
- [ ] **Test coverage ≥80%** for all app logic and DOM-sync code (enforced in every phase quality gate).
- [ ] All behavior covered by tests (unit for state/logic, integration/E2E for UI where useful).
- [ ] No regression: existing layout and styles preserved.
- [ ] **After build**: full frontend refactor (Phase 5) applied; layout, styles, and structure cleaned up.

### User Impact
- The workspace becomes usable as an interactive prototype: mode, tools, tabs, and AI chat respond to user input and can be extended later (e.g. real export, real AI).

---

## Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| Extract JS to a separate file (e.g. `app.js`) | Enables unit tests (Jest + jsdom) without loading full HTML; clear separation of behavior and markup | One more file to load from code.html |
| Pure JS (no framework) | Matches single HTML file; minimal tooling; easy to run in browser and in jsdom | Larger apps might later want a framework |
| State object + DOM sync | Single source of truth (mode, tool, tab, sidebar, selection); handlers update state then sync DOM | Need to keep selectors and state in sync (centralize in one place) |
| E2E with Playwright (optional phase) | Validates full click/input flow in real browser | Extra dependency and run time |

---

## Dependencies

### Required Before Starting
- [ ] code.html exists and current UI is unchanged in structure (ids or data attributes can be added for tests).
- [ ] Node.js available for Jest (and optional Playwright).

### External Dependencies
- Jest + jsdom: unit and integration tests (DOM assertions).
- (Optional) Playwright: E2E for one critical path (e.g. mode toggle + AI send).

---

## Test Strategy

**TDD**: Write tests FIRST, then implement until they pass, then refactor.

### Test pyramid and coverage requirement
- **Overall: test coverage must be >80%** (Jest `--coverage`; apply to `js/` and any logic used by code.html). Quality gates block progression if coverage drops below 80%.
| Test type | Coverage target | Purpose |
|-----------|-----------------|---------|
| Unit | ≥80% of app state / handlers | State and pure logic (e.g. setMode, getActiveTool) |
| Integration | Critical paths; part of 80% | DOM updates after actions (jsdom + handlers, assert classes/attributes) |
| E2E (optional) | 1+ flow | Sanity in real browser (mode toggle + AI send) |

### Test file organization
```
# Repo root (same level as code.html)
tests/
  unit/
    appState.test.js    # state getters/setters, mode, tool, tab
  integration/
    domSync.test.js     # state changes reflect in DOM (with jsdom + code.html or fixture)
  e2e/                  # optional
    workspace.spec.js   # Playwright: open code.html, click, assert
```

### Coverage by phase
- Phase 1: Unit tests for state and mode toggle; integration test that mode click updates DOM. **Running coverage after Phase 1 must be ≥80% for touched code.**
- Phase 2: Unit + integration for sidebar, viewport tool, viewport tab. **Cumulative coverage ≥80%.**
- Phase 3: Unit + integration for AI input, send, and message appending to DOM. **Cumulative coverage ≥80%.**
- Phase 4: Menu/Export stubs, tree selection; optional E2E. **Full app coverage ≥80% before Phase 5.**
- Phase 5: Frontend refactor only; no new behavior. **All existing tests must stay green; coverage ≥80% maintained.**

---

## All Tests (Master List)

Below is the full list of tests to be implemented. Each phase adds the listed tests in RED first, then implements to GREEN.

### Unit tests (`tests/unit/`)

**appState.test.js**
- `getMode()` returns initial mode (e.g. `'design'`).
- `setMode('design')` sets mode to `'design'`.
- `setMode('simulate')` sets mode to `'simulate'`.
- `setMode('animate')` sets mode to `'animate'`.
- `setMode()` with invalid value does not change mode (or throws).
- `getActiveSidebar()` returns initial sidebar pane.
- `setActiveSidebar(id)` sets active sidebar; only one active.
- `getActiveTool()` returns initial viewport tool.
- `setActiveTool(id)` sets active tool; only one active.
- `getActiveViewportTab()` returns initial tab.
- `setActiveViewportTab(id)` sets active tab; only one active.
- `getTreeExpanded()` / `setTreeExpanded(nodeId, boolean)` for expand/collapse.
- `getSelectedTreeId()` / `setSelectedTreeId(id)` for tree selection.
- `getMessages()` returns array; `appendUserMessage(text)` appends and returns new list (or equivalent).

**aiPanel.test.js (or inside appState)**
- `appendUserMessage(text)` adds one message with correct text.
- `appendUserMessage('')` does not add empty message (or is allowed and rendered as empty bubble).
- Command palette: `isCommandPaletteOpen()` / `setCommandPaletteOpen(bool)`.

### Integration tests (`tests/integration/`)

**modeToggle.test.js**
- After `setMode('simulate')` and `syncModeToDOM()`, the Simulate button has active class/attribute; Design and Animate do not.

**sidebar.test.js**
- After `setActiveSidebar('explorer')` and sync, only the Project Explorer button has active state in DOM.

**viewportTool.test.js**
- After `setActiveTool('move')` and sync, only the Move tool button has active state in DOM.

**viewportTab.test.js**
- After `setActiveViewportTab('wireframe')` and sync, only the Wireframe tab has active state in DOM.

**aiPanel.test.js**
- When textarea has text and Send is triggered (or `submitAIInput()`), a new user message node appears in the chat container with that text.
- After submit, textarea is cleared.

**tree.test.js**
- Toggling expand on a node updates DOM (e.g. collapse/expand icon or class).
- Selecting a tree item updates state and DOM (selected item has active class).

### E2E tests (`tests/e2e/`, optional)

**workspace.spec.js**
- Open code.html, click Simulate: mode switches to Simulate (active state visible).
- Type in AI textarea, click Send: new user message appears in chat.

---

## Implementation Phases

### Phase 1: Test setup + app state + mode toggle
**Goal**: Jest + jsdom run; app state (mode) exists; Design/Simulate/Animate buttons change state and DOM.  
**Estimated time**: 1–2 hours  
**Status**: Pending  

#### Tasks

**RED: Write failing tests first**
- [ ] **Test 1.1** – Unit tests for app state (e.g. `getMode()`, `setMode('design'|'simulate'|'animate')`).
  - File: `tests/unit/appState.test.js`
  - Expected: Tests fail (state module or functions do not exist).
- [ ] **Test 1.2** – Integration test: load HTML (fixture or code.html), get mode buttons, call setMode and sync DOM; assert active button has expected class/attribute.
  - File: `tests/integration/domSync.test.js` (or `modeToggle.test.js`)
  - Expected: Fails (no DOM sync implementation).

**GREEN: Implement to make tests pass**
- [ ] **Task 1.3** – Add `js/app.js` (or single file): state object, `getMode()`, `setMode()`. No DOM yet.
  - Goal: Test 1.1 passes.
- [ ] **Task 1.4** – In code.html: add script tag to app.js; give mode buttons stable selectors (e.g. data-mode="design"). Wire click to setMode and update DOM (active class).
  - Goal: Test 1.2 passes.

**REFACTOR**
- [ ] **Task 1.5** – Extract DOM selectors and sync logic; keep state pure; add minimal comments.

#### Quality gate (Phase 1)
- [ ] Tests were written first and failed, then passed after implementation.
- [ ] `npm test` passes; **`npm test -- --coverage` shows ≥80% for `js/`** (or for files touched in this phase).
- [ ] Manual: Click Design/Simulate/Animate and see exactly one active.
- [ ] Lint (if configured) passes.

---

### Phase 2: Sidebar, viewport tool, viewport tab
**Goal**: Sidebar buttons set active pane; viewport toolbar sets active tool; bottom tabs set active tab; state and DOM stay in sync.  
**Estimated time**: 1.5–2 hours  
**Status**: Pending  

#### Tasks

**RED**
- [ ] **Test 2.1** – Unit tests for `getActiveSidebar()`, `setActiveSidebar()`, `getActiveTool()`, `setActiveTool()`, `getActiveViewportTab()`, `setActiveViewportTab()`.
- [ ] **Test 2.2** – Integration: after setActiveSidebar / setActiveTool / setActiveViewportTab, assert corresponding elements have active state in DOM.

**GREEN**
- [ ] **Task 2.3** – Extend app state and implement sidebar/tool/tab getters and setters.
- [ ] **Task 2.4** – In code.html: add data attributes or ids for sidebar, viewport tools, viewport tabs; wire click handlers and DOM sync.

**REFACTOR**
- [ ] **Task 2.5** – Shared “set active in group” helper; consistent naming.

#### Quality gate (Phase 2)
- [ ] All new tests pass; no regression in Phase 1.
- [ ] **Coverage ≥80%** for `js/` (cumulative).
- [ ] Manual: Sidebar, viewport tool, and viewport tab each show single active state.

---

### Phase 3: AI panel – input, send, messages
**Goal**: User can type in AI textarea; Send (and Enter) appends user message to chat area; optional ⌘+K opens command palette (stub).  
**Estimated time**: 1.5–2 hours  
**Status**: Pending  

#### Tasks

**RED**
- [ ] **Test 3.1** – Unit: e.g. `appendUserMessage(text)` returns or updates structure that can be rendered (or test via DOM).
- [ ] **Test 3.2** – Integration: simulate Send click with text in textarea; assert new user message node in chat container with correct text.

**GREEN**
- [ ] **Task 3.3** – Implement appendUserMessage (and optionally a small render helper); wire Send button and Enter key to read textarea, append, clear input.
- [ ] **Task 3.4** – Add ⌘+K listener; show/hide command palette stub (e.g. a small div or console.log).

**REFACTOR**
- [ ] **Task 3.5** – Reuse message DOM structure; escape text for safety.

#### Quality gate (Phase 3)
- [ ] All tests pass; **coverage ≥80%** for `js/`.
- [ ] Manual: type and Send adds message; ⌘+K does not break page.

---

### Phase 4: Menus, Export, project tree, polish
**Goal**: File/Edit/Modify/Render/Window and Export Project have handlers (stub); project tree expand/collapse and selection work; optional E2E.  
**Estimated time**: 1–2 hours  
**Status**: Pending  

#### Tasks

**RED**
- [ ] **Test 4.1** – Unit or integration: tree expand/collapse toggles; selection updates state and DOM.
- [ ] **Test 4.2** (optional) – E2E: open code.html, toggle mode, type in AI and Send, assert message appears.

**GREEN**
- [ ] **Task 4.3** – Wire menu links and Export to stubs (e.g. `console.log` or `alert`).
- [ ] **Task 4.4** – Tree: expand/collapse and selection state + DOM (e.g. data-node-id, active class).
- [ ] **Task 4.5** – (Optional) Playwright spec for one full flow.

**REFACTOR**
- [ ] **Task 4.6** – Consistent stub pattern; tree logic readable.

#### Quality gate (Phase 4)
- [ ] All tests pass; **full app coverage ≥80%** before starting Phase 5.
- [ ] Every button has a defined behavior; manual check of menus, Export, tree, and AI.

---

### Phase 5: Refactor all frontend parts
**Goal**: After all buttons and functions are built and tested, refactor the entire frontend: HTML structure, CSS (Tailwind usage), layout, accessibility, and code organization—without changing behavior. All tests must remain green and coverage ≥80%.  
**Estimated time**: 2–3 hours  
**Status**: Pending  

#### Tasks

**RED**
- [ ] **Test 5.1** – No new tests required; existing suite is the contract. Optionally add a single E2E “smoke” test that opens code.html and asserts critical regions exist (header, main, AI panel) to guard against accidental removal during refactor.

**GREEN (Refactor only)**
- [ ] **Task 5.2** – Refactor **code.html**: semantic structure (header/main/aside, landmarks), remove duplicate class strings, consistent naming (data attributes, ids), improve accessibility (ARIA, focus order, labels).
- [ ] **Task 5.3** – Refactor **styles**: consolidate Tailwind classes; extract repeated patterns into a small set of utility classes or a single `<style>` block if beneficial; align with design system (e.g. dark/calm palette if planned).
- [ ] **Task 5.4** – Refactor **js/app.js** (and any other JS): extract DOM selectors into a config object; group handlers by area (header, sidebar, viewport, AI); consistent naming; remove dead code; add minimal JSDoc for public functions.
- [ ] **Task 5.5** – Ensure single source of truth for “active” and “selected” styles (e.g. one class like `.is-active` / `[data-active="true"]` used everywhere).

**REFACTOR**
- [ ] **Task 5.6** – Review readability and file length; split `app.js` into multiple modules only if it clearly improves maintainability (e.g. `state.js`, `domSync.js`, `handlers.js`) while keeping tests green.

#### Quality gate (Phase 5)
- [ ] **All existing tests pass**; no behavior change.
- [ ] **Coverage ≥80%** maintained (no removal of covered code without replacing with equivalent tests).
- [ ] Manual: full click-through of all buttons and inputs; layout and visuals intact or improved.
- [ ] Lint and any HTML/CSS validation pass.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-------------|
| Selectors break after HTML change | Medium | Medium | Use data attributes and a single selector map; document in app.js |
| jsdom vs browser behavior difference | Low | Low | Prefer simple DOM APIs; add one E2E if needed |
| Scope creep (e.g. real export) | Medium | Medium | Keep Phase 4 to stubs and tree only; export = stub |

---

## Rollback Strategy

- **Phase 1**: Remove `app.js`, test folder, and script tag from code.html; restore code.html from git.
- **Phase 2–4**: Revert commits for that phase; state and DOM code is additive, so rollback is per file.
- **Phase 5**: Restore code.html and js/ from end of Phase 4; all behavior and tests return to Phase 4 state.

---

## Progress Tracking

- **Phase 1**: 0%
- **Phase 2**: 0%
- **Phase 3**: 0%
- **Phase 4**: 0%
- **Phase 5 (Frontend refactor)**: 0%

**Overall**: 0%

---

## Notes and Learnings

- (To be filled as phases complete.)
- **Validation commands** (example):  
  `npm test` or `npx jest`  
  Optional: `npx playwright test` for E2E.

---

## Final Checklist

Before marking plan complete:
- [ ] All 5 phases completed and quality gates passed
- [ ] **Test coverage >80%** (enforced and verified in each phase)
- [ ] Every listed button/input has a wired function
- [ ] Test suite green and run in reasonable time
- [ ] Phase 5: frontend refactor done; code.html and js/ are clean, consistent, and accessible
- [ ] code.html valid and layout intact; UI redesign (e.g. dark/calm) can be done in Phase 5 or as a follow-up
