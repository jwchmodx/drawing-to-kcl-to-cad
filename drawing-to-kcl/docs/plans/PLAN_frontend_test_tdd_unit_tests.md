# Implementation Plan: frontend_test Unit Tests & Refactoring

**Status**: 🔄 In Progress  
**Started**: 2025-01-31  
**Last Updated**: 2025-01-31  
**Estimated Completion**: 2025-02-02  

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date above
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

---

## 📋 Overview

### Feature Description
Add comprehensive unit tests and refactoring for all features in `drawing-to-kcl/frontend_test/`:
- **threeCameraUtils** (lib): Pure math utilities for bounding box and camera
- **PanelResizer** (component): Draggable panel divider
- **KclPreview3D** (component): Three.js 3D mesh renderer
- **App** (page): Main layout with left/middle/right panels

### Success Criteria
- [ ] All production code has ≥80% unit test coverage
- [ ] Tests written BEFORE or alongside refactoring (TDD-compliant)
- [ ] Code refactored for clarity, DRY, and maintainability
- [ ] Build passes, no lint errors

### User Impact
- Safer refactoring and feature additions
- Regression prevention
- Living documentation of expected behavior

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| Vitest over Jest | Vite-native, fast, same config | Slightly different API than Jest |
| WebGL mocking | KclPreview3D uses Three.js/WebGL | Mock may not cover all WebGL paths |
| Extract panel constants | App has magic numbers | Single source of truth |

---

## 📦 Dependencies

### Required Before Starting
- [x] Vite + React project exists at frontend_test/
- [ ] Vitest, @testing-library/react, jsdom installed

### External Dependencies
- vitest: ^2.x
- @testing-library/react: ^16.x
- @testing-library/user-event: ^14.x
- @testing-library/jest-dom: ^6.x
- jsdom: for DOM environment

---

## 🧪 Test Strategy

### Test Pyramid
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit** | ≥80% | threeCameraUtils, PanelResizer, KclPreview3D logic |
| **Component** | Critical paths | React component behavior, user events |

### Test File Organization
```
frontend_test/
├── src/
│   ├── __tests__/
│   │   ├── threeCameraUtils.test.ts
│   │   ├── PanelResizer.test.tsx
│   │   ├── KclPreview3D.test.tsx
│   │   └── App.test.tsx
```

---

## 🚀 Implementation Phases

### Phase 1: Test Infrastructure + threeCameraUtils
**Goal**: Vitest setup, threeCameraUtils unit tests (≥80% coverage)  
**Estimated Time**: 1–2 hours  
**Status**: ✅ Complete  

#### Tasks

**🔴 RED: Write Failing Tests First**
- [x] **Test 1.1**: Add Vitest + deps to package.json
- [x] **Test 1.2**: Create vitest.config.ts, setup file
- [x] **Test 1.3**: Write `threeCameraUtils.test.ts`
  - computeBoundingBox: empty, single vertex, box, offset box
  - computeCameraForBounds: valid bounds, zero radius
- [x] Run tests → pass for threeCameraUtils

**🟢 GREEN**
- [x] **Task 1.4**: Tests pass
- [x] **Task 1.5**: `npm run test` and `npm run test:coverage` pass

**🔵 REFACTOR**
- [x] **Task 1.6**: threeCameraUtils already clean

#### Quality Gate
- [x] `npm run test` passes
- [x] `npm run build` passes

---

### Phase 2: PanelResizer Unit Tests & Refactor
**Goal**: PanelResizer fully tested, drag behavior verified  
**Estimated Time**: 1–2 hours  
**Status**: ✅ Complete  

#### Tasks

**🔴 RED: Write Failing Tests First**
- [x] **Test 2.1**: Write `PanelResizer.test.tsx`
  - Renders with role="separator", aria-orientation="vertical"
  - Calls onResize with deltaX when drag simulated
  - Applies className prop, prevents default on mousedown
  - Stops onResize after mouseup

**🟢 GREEN**
- [x] **Task 2.2**: All PanelResizer tests pass

**🔵 REFACTOR**
- [x] **Task 2.3**: PanelResizer logic is minimal, no extraction needed

#### Quality Gate
- [x] PanelResizer tests pass

---

### Phase 3: KclPreview3D Unit Tests & Refactor
**Goal**: KclPreview3D tested with WebGL/Three.js mocks  
**Estimated Time**: 2–3 hours  
**Status**: ✅ Complete  

#### Tasks

**🔴 RED: Write Failing Tests First**
- [x] **Test 3.1**: Add WebGL + OrbitControls mocks in setup
- [x] **Test 3.2**: Write `KclPreview3D.test.tsx`
  - Renders container with data-testid="kcl-preview-3d"
  - Handles null/undefined/empty preview
  - Handles valid preview without throwing

**🟢 GREEN**
- [x] **Task 3.3**: All KclPreview3D tests pass

**🔵 REFACTOR**
- [x] **Task 3.4**: KclPreview3D structure acceptable

#### Quality Gate
- [x] KclPreview3D tests pass (with WebGL mock)

---

### Phase 4: App Integration Tests & Refactor
**Goal**: App layout and panel resize integration tested  
**Estimated Time**: 1–2 hours  
**Status**: ✅ Complete  

#### Tasks

**🔴 RED: Write Failing Tests First**
- [x] **Test 4.1**: Mock KclPreview3D in App tests
- [x] **Test 4.2**: Write `App.test.tsx`
  - Renders header "Architect"
  - Renders Project Explorer, AI Assistant, KclPreview3D
  - PanelResizer present
  - Menu items, mode toggle, AI input

**🟢 GREEN**
- [x] **Task 4.3**: Extract SAMPLE_PREVIEW, MIN/MAX/DEFAULT to constants.ts
- [x] **Task 4.4**: All App tests pass

**🔵 REFACTOR**
- [x] **Task 4.5**: Constants extracted

#### Quality Gate
- [x] App tests pass
- [x] `npm run build` succeeds

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WebGL mock incomplete | Medium | Low | Fallback: test container render only, skip canvas checks |
| Vitest config issues | Low | Medium | Follow Vite/Vitest docs, reference drawing-to-kcl Jest setup |
| PanelResizer drag timing | Low | Low | Use user-event for realistic events |

---

## 🔄 Rollback Strategy

### Phase 1
- Remove vitest deps, delete __tests__, vitest.config.ts, restore package.json scripts

### Phase 2–4
- Delete test files, revert component changes via git

---

## 📊 Progress Tracking

- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%

**Overall**: 0% complete

---

## 📝 Notes & Learnings

(To be filled during implementation)

---

## Validation Commands

```bash
cd drawing-to-kcl/frontend_test

# Install deps
npm install

# Run tests
npm run test

# Coverage
npm run test:coverage

# Build
npm run build

# Lint (if configured)
npm run lint
```
