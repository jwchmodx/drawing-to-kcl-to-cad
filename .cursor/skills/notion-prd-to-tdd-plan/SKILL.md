---
name: notion-prd-to-tdd-plan
description: (1) 사용자가 플랜을 짜면 TDD에 맞게 플랜을 재구성해 준다. (2) 빌드 요청 시 진행 중인 수정/구현 내용을 PRD 형태로 정리해 노션에 올린다. (3) 작업 완료 후 결과 요약을 노션에 올린다. 스킬 사용 시 프로젝트마다 초반에 "어떤 노션 페이지/DB에 넣을지" 한 번 묻고, 그 대상을 기준으로 읽기·쓰기를 한다. Notion MCP로 연동, 미설정 시 마크다운 출력으로 대체.
---

# Notion PRD ↔ TDD Plan

- **플랜 입력 시**: 사용자가 설명한 플랜(또는 Notion PRD)을 TDD에 맞는 구현 플랜 + 태스크 목록으로 재구성한다.
- **빌드 요청 시**: 현재 수정/구현 내용을 PRD 형태로 잘 정리해 **노션에 새 페이지로 올린다.**
- **완료 후**: 결과를 요약해 **노션에 요약 페이지로 올린다.**

이 스킬을 사용하는 경우: 사용자가 플랜을 짜거나, 빌드/구현을 요청하거나, 완료 요약을 노션에 올리라고 하거나, Notion PRD URL을 줄 때.

---

## 프로젝트마다 노션 대상 정하기 (필수)

**이 스킬을 쓰기 시작할 때, 프로젝트마다 반드시 한 번 묻는다:**

- "이번 작업에서 노션에 올릴 **대상(페이지 또는 데이터베이스)**을 정해 주세요. 구현 PRD·완료 요약을 어떤 노션 페이지/DB에 넣을까요?"
- 사용자가 **페이지 URL**, **데이터베이스 URL**, 또는 **제목/이름**(이름만 주면 `notion-search`로 찾음)을 알려주면, 그걸 **이번 프로젝트의 노션 작업 대상**으로 저장한다.
- 이후 이 대화 안에서:
  - **읽기**: PRD를 가져올 때 이 대상(또는 사용자가 지정한 특정 페이지)을 사용한다.
  - **쓰기**: 구현 PRD·완료 요약 페이지를 **이 대상이 데이터베이스면 그 DB 안에**, **페이지면 그 페이지 하위 또는 같은 DB에** 생성한다(Notion MCP에서 허용하는 방식으로).

대상을 아직 안 물었으면 **플랜 단계·빌드 요청·완료 요약 중 노션을 쓸 일이 생기기 전에** 먼저 위처럼 물어본다. 이미 이 대화에서 "이 DB에 넣어줘" 등으로 지정했으면 다시 묻지 않고 그 대상을 쓴다.

---

**노션 연동**: 노션 읽기·쓰기는 **Notion MCP**를 사용한다. MCP가 설정되어 있으면 `Notion:notion-search`, `Notion:notion-fetch`, `Notion:notion-create-pages`, `Notion:notion-update-page` 도구로 페이지 검색·조회·생성·수정을 한다. **페이지 생성·본문 수정 시 파라미터 형식은 이 스킬 폴더의 `NOTION_MCP_PARAMS.md`를 반드시 참고한다.** MCP가 없으면 구조화된 마크다운을 출력해 사용자가 노션에 붙여넣을 수 있게 한다.

## Notion MCP 설정 방법

Cursor에서 Notion MCP를 쓰려면 다음 중 하나로 설정한다.

### 방법 1: Cursor 설정 UI (권장)

1. **Cursor** → **Settings** → **MCP** (또는 **Features** → **MCP Servers**) 이동
2. **Add new MCP server** 선택
3. 서버 추가:
   - **이름**: `Notion` (원하는 이름)
   - **Command**: `npx`
   - **Args**: `-y`, `mcp-remote`, `https://mcp.notion.com/mcp`
4. 저장 후 Cursor 재시작
5. 첫 사용 시 Notion OAuth 로그인(브라우저)으로 워크스페이스 접근 권한 부여

### 방법 2: mcp.json으로 설정

프로젝트 루트 또는 사용자 설정에 MCP 설정 파일을 둔다.

**프로젝트용** (예: `.cursor/mcp.json` 또는 루트 `mcp.json`):

```json
{
  "mcpServers": {
    "Notion": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.notion.com/mcp"]
    }
  }
}
```

**전역 설정** (Cursor 사용자 설정 경로의 mcp 설정):

- macOS: `~/.cursor/mcp.json` 또는 Cursor 앱 내 MCP 설정
- Windows: `%USERPROFILE%\.cursor\mcp.json`

설정 후 Cursor를 다시 켜고, 도구 목록에 Notion이 보이는지 확인한다.

### 필요한 것

- Node.js 18+
- Notion 계정 및 대상 워크스페이스 접근 권한
- OAuth 완료 후 해당 워크스페이스의 페이지/DB만 접근 가능

### 문제 해결

- **Notion이 도구 목록에 안 보임**: MCP 설정 문법 확인, Cursor 재시작, `npx -y mcp-remote https://mcp.notion.com/mcp` 터미널에서 실행해 오류 여부 확인
- **특정 페이지/DB 접근 안 됨**: Notion 앱에서 해당 페이지·DB 공유/연결이 되어 있는지 확인
- **OAuth 실패**: 팝업 차단 해제 후 다시 시도. Notion **Settings** → **Connections** → **Notion MCP**에서 연결/해제 가능

---

## Quick Start (플랜 → TDD 플랜)

사용자가 **플랜을 설명**했을 때(말로 된 요구사항, Notion PRD URL, 또는 기존 계획서):

0. **노션 쓸 예정이면**: 아직 이번 프로젝트의 노션 대상을 안 물었으면 위 "프로젝트마다 노션 대상 정하기"대로 **어떤 페이지/DB에 넣을지** 먼저 묻는다.
1. **플랜 소스 파악**
   - **Notion PRD URL**이 있으면: `Notion:notion-fetch`로 해당 페이지 내용을 가져온다. DB URL만 있으면 `Notion:notion-search`로 검색하거나, 제목·상태로 어떤 PRD 쓸지 사용자에게 한 번만 확인한다.
   - **말로 된 플랜**이면: 목표, 범위, 주요 기능, 제약을 정리해 내부 요약으로 만든다.
2. **요구사항 정리**
   - 목표, 사용자 문제, 범위, 비목표, 주요 플로우, 제약, 성공 지표를 추출한다.
3. **구현 플랜 작성**
   - 기능/에픽 단위로 나누고, 각각 테스트 가능한 산출물·수용 기준을 적는다.
4. **TDD 태스크 목록 생성**
   - 각 산출물에 대해 실패 테스트 → 최소 구현 → 리팩터 순서의 작은 태스크로 나눈다.
5. **`tdd-automation` 전달 준비**
   - 태스크를 한 덩어리씩 실행할 수 있도록, 스펙·파일·API 문맥을 포함해 정리한다.

Notion PRD가 **없어도** 사용자가 "이렇게 구현하고 싶다"라고 설명하면 위 2~5를 적용해 TDD 플랜을 만든다.

## Workflow

### Step 1: Identify and fetch the plan (PRD 또는 사용자 설명)

1. **플랜 소스 확인**
   - **Notion PRD**: DB URL만 주어지면 어떤 PRD 쓸지(제목·상태·ID) 한 번만 묻는다. 특정 PRD 페이지 URL이 있으면 그걸 사용한다.
   - **사용자 설명**: "이렇게 구현하고 싶다"처럼 말로 된 플랜이면, 목표·범위·기능·제약을 질문하거나 대화에서 추출해 정리한다.
2. **내용 가져오기 (Notion PRD인 경우)**
   - **Notion MCP 사용**: `Notion:notion-search`로 PRD 제목/키워드 검색 → `Notion:notion-fetch`로 페이지 URL/ID를 넘겨 본문을 가져온다.
   - MCP가 없으면: 브라우저 도구나 `WebFetch`로 URL 내용을 가져온다.
3. **구조 추출**
   - PRD 섹션(Overview, Problem, Goals, Requirements, UX flows 등) 또는 사용자 설명을 다음 형태로 요약한다:
     - **Context** / **Goals·Success metrics** / **Key user journeys** / **Functional·Non-functional requirements** / **Constraints·Risks** / **Open questions**

이 요약이 구현 플랜의 기준이 되므로 짧고 명확하게 둔다.

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

---

## 빌드 요청 시: 노션에 구현 PRD 올리기

사용자가 **빌드/구현을 요청**했을 때, 진행 중인 수정·구현 내용을 PRD 형태로 정리해 노션 데이터베이스에 올린다.

1. **현재 변경 내용 정리**
   - 수정/추가된 파일 목록, 구현된 기능, API·UI 변경 사항을 정리한다.
   - 다음 구조로 **구현 PRD(진행 중)** 문서를 만든다:
     - **제목**: `[구현 PRD] <기능/프로젝트명> - YYYY-MM-DD` 또는 사용자가 지정한 제목
     - **요약**: 1~2문단으로 무엇을 바꾸고 있는지, 현재 단계(Phase) 요약
     - **변경 파일 목록**: 경로와 한 줄 설명
     - **구현된 기능**: 기능별로 수용 기준·상태(완료/진행 중/대기)
     - **다음 단계**: 남은 태스크 또는 다음 Phase 요약
2. **노션에 업로드**
   - **Notion MCP 사용**: 이번 프로젝트에서 정한 노션 대상(DB 또는 페이지)을 parent로 사용해, 아래 "노션 업로드 절차" A에 따라 `Notion:notion-create-pages`(및 필요 시 `notion-update-page`)로 새 페이지를 만들고 내용을 채운다.
   - **MCP 없을 때**: 절차 B에 따라 마크다운을 출력하고, 사용자에게 노션에 붙여넣으라고 안내한다.

---

## 완료 후: 노션에 결과 요약 올리기

**작업이 완료**되었을 때(Phase 완료 또는 전체 완료), 결과를 요약해 노션 데이터베이스에 올린다.

1. **결과 요약 작성**
   - **제목**: `[완료 요약] <기능/프로젝트명> - YYYY-MM-DD`
   - **완료 범위**: 어떤 Phase/기능까지 완료했는지
   - **산출물**: 추가/변경된 주요 파일, 새 API, UI 변경 요약
   - **테스트·품질**: 통과한 테스트 수, 커버리지(알고 있으면), 알려진 이슈
   - **다음 권장 사항**: 남은 작업, 리팩터 제안, 배포 시 주의사항 등(있으면)
2. **노션에 업로드**
   - **Notion MCP 사용**: 이번 프로젝트에서 정한 노션 대상을 사용해, 아래 "노션 업로드 절차" A에 따라 `Notion:notion-create-pages`(및 필요 시 `notion-update-page`)로 새 페이지를 만들고 요약을 채운다. **호출 시 `NOTION_MCP_PARAMS.md`의 파라미터 형식을 따른다.**
   - **MCP 없을 때**: 절차 B에 따라 마크다운을 출력하고, 사용자에게 노션에 붙여넣으라고 안내한다.

---

## 노션 업로드 절차

팀 노션 DB에 페이지를 만들 때 다음 중 하나를 따른다.

### A. Notion MCP 사용 (권장)

Notion MCP가 설정되어 있으면:

1. **대상 사용**: 이번 프로젝트에서 사용자가 지정한 **노션 대상**(페이지 또는 DB)을 쓴다. 아직 안 물었으면 "프로젝트마다 노션 대상 정하기" 절차대로 먼저 묻는다.
2. **DB ID·제목 속성 확인**: 대상이 데이터베이스면 `Notion:notion-fetch`(DB id)로 스키마를 조회해 **제목 속성 이름**(예: `"이름"`)을 확인한다. 상세 파라미터는 **`NOTION_MCP_PARAMS.md`** 참고.
3. **페이지 생성**: `Notion:notion-create-pages` 사용
   - **상위 인자**: `database_id`(DB UUID), `pages`(배열).
   - **각 페이지**: `properties`만 사용. 예: `{ "properties": { "이름": "[완료 요약] <기능명> - YYYY-MM-DD" } }`. `parent` 키는 사용하지 않는다.
   - 제목 규칙: 구현 PRD면 `[구현 PRD] <기능명> - YYYY-MM-DD`, 완료 요약이면 `[완료 요약] <기능명> - YYYY-MM-DD`.
4. **본문 채우기**: 생성 응답의 `pages[0].id`로 `Notion:notion-update-page` 호출.
   - **인자**: `id`(페이지 ID), `data`: `{ "page_id": "<같은 페이지 ID>", "command": "replace_content", "new_str": "<본문 텍스트, 줄바꿈 \\n>" }`.
5. **위치 보정 안내**: MCP가 페이지를 **워크스페이스 최상위**에 만드는 경우가 있다. 대상이 "Drawing to CAD" 페이지 안의 "개발 PRD" 같은 **페이지 내부 DB**일 때는, 생성 후 사용자에게 **`NOTION_MCP_PARAMS.md`의 "올바르게 넣는 방법"**을 안내한다. (Notion에서 해당 페이지 → Move to → 대상 페이지 안의 DB로 이동, 또는 DB에서 직접 새 행 만들고 본문 붙여넣기.)

**실제 파라미터 형식·예시는 반드시 `NOTION_MCP_PARAMS.md`를 참고한다.** (create-pages는 `parent`/객체형 title이 아님, update-page는 `data` 내 `command`/`new_str` 사용. MCP 한계로 페이지가 최상위에 생성되면 사용자가 수동으로 이동해야 함.)

### B. MCP 없을 때: 구조화된 출력으로 제공

Notion MCP가 없거나 호출이 불가능하면:

1. **PRD/요약을 마크다운으로 생성**한 뒤, 사용자에게 안내한다:
   - "아래 내용을 노션 DB에 새 페이지로 붙여넣어 주세요. (DB: [위 노션 DB URL])"
2. **제공 형식**: 제목 + 본문을 Notion에서 붙여넣기 좋게 계층형 마크다운(헤딩, 불릿, 코드 블록)으로 정리한다.

---

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

