# UI: code.html 레이아웃 그대로 맞추기 (TDD)

**목표**: code.html을 그대로 넣었다고 보고, drawing-to-kcl/frontend를 조금씩 code.html과 동일한 레이아웃·스타일로 맞춘다.

**기준**: [code.html](https://github.com/.../code.html) 구조와 클래스명을 참고. 테스트는 기존 layoutPanels 등 유지하되, 변경된 기본값(왼쪽 256px 등)은 테스트에서 수정.

## Phase 1: 루트·스트립·패널 기본 구조

- **목표**: body/메인 컨테이너·로딩 스트립이 code.html과 동일한 클래스/톤.
- **RED**: (선택) 로딩 스트립에 `border-white/10` 사용 여부 검사.
- **GREEN**:
  - 로딩/에러 스트립: `border-zinc-800` → `border-white/10`, 텍스트 `text-[#9cabba]`.
  - 메인 하단 영역: code.html처럼 `flex flex-1 overflow-hidden`.
- **REFACTOR**: 중복 클래스 정리.

## Phase 2: 왼쪽 패널 (Project Explorer 스타일)

- **목표**: code.html 왼쪽 패널과 동일한 헤더·너비·스타일.
- **RED**: 왼쪽 패널 헤더에 `unfold_more` 아이콘 또는 동일 클래스 구조 존재 검사.
- **GREEN**:
  - 왼쪽 패널 기본 너비 280 → 256 (code.html `w-64`).
  - 헤더: `p-4`, `border-b border-white/5`, 제목 + `material-symbols-outlined` `unfold_more` (우측). 제목은 "Files & Code" 유지(기능상).
- **REFACTOR**: 테스트에서 leftWidth 기본값 256 기대하도록 수정.
- **품질**: layoutPanels 테스트 전부 통과.

## Phase 3: 메인 뷰포트 (헤더 제거, HUD 추가)

- **목표**: code.html처럼 메인에 "Preview" 상단 바 없이 뷰포트만, 하단 좌측에 HUD.
- **RED**: 뷰포트 영역에 FPS 또는 XYZ HUD 요소 존재 검사.
- **GREEN**:
  - 센터 패널에서 "Preview" 상단 바 제거 → 뷰포트가 맨 위부터 채움.
  - 뷰포트 내부 좌측 하단에 code.html과 동일한 HUD: FPS 뱃지 + XYZ 원형.
- **REFACTOR**: Raw JSON 디버그는 유지하되 HUD와 겹치지 않게 위치 조정.
- **품질**: center panel 관련 테스트 수정(헤더 텍스트 제거 시 "Preview" 검사 제거 또는 다른 식별자 사용).

## Phase 4: 오른쪽 패널 (chat/close 버튼, border 통일)

- **목표**: AI Assistant 헤더에 chat/close 아이콘 버튼, 하단 border code.html과 동일.
- **RED**: 오른쪽 패널 헤더에 chat 또는 close 아이콘 버튼 존재 검사.
- **GREEN**:
  - AI Assistant 헤더 우측에 `chat`, `close` Material 아이콘 버튼 추가 (code.html과 동일 클래스).
  - CommandInput 상단/패널 하단: `border-zinc-800` → `border-white/10`.
- **REFACTOR**: 테스트는 기존 AI Assistant·bolt 검사 유지.
- **품질**: 모든 테스트·빌드 통과.

## 검증

- `cd drawing-to-kcl/frontend && npm run build && npm test`
- 수동: code.html과 나란히 비교해 레이아웃·색·여백이 동일한지 확인.

## 노션

- 이번 프로젝트 노션 대상이 정해지면, 구현 PRD(진행 중)·완료 요약을 해당 페이지/DB에 정리.
