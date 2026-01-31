# [완료 요약] UI code.html 레이아웃 맞추기 - 2025-01-30

## 완료 범위

- **Phase 1**: 루트·스트립·패널 구조 → 로딩 스트립 `border-white/10`, `text-[#9cabba]`, 메인 영역 `overflow-hidden` 적용
- **Phase 2**: 왼쪽 패널 → 기본 너비 256px (w-64), 헤더 `p-4`·`border-white/5`, "Files & Code" + `unfold_more` 아이콘
- **Phase 3**: 메인 뷰포트 → "Preview" 상단 바 제거, 뷰포트 전체 높이 사용, 좌측 하단 HUD (FPS 뱃지 + XYZ 원형) 추가
- **Phase 4**: 오른쪽 패널 → AI Assistant 헤더에 chat/close 아이콘 버튼, CommandInput 영역 `border-white/10` 통일

## 산출물

- **계획서**: `docs/plans/PLAN_ui_code_html_layout_match.md`
- **수정 파일**:
  - `drawing-to-kcl/frontend/app/page.tsx` (로딩 스트립, 왼쪽 헤더·너비, 센터 헤더 제거·HUD, 오른쪽 헤더·border)
  - `drawing-to-kcl/frontend/__tests__/layoutPanels.test.tsx` (왼쪽 기본 너비 256px 기대)

## 테스트·품질

- 테스트: 204개 전부 통과
- 빌드: 성공
- TDD: 기존 layoutPanels·page 테스트 유지, 변경된 기본값만 수정

## 다음 권장 사항

- code.html과 수동 비교로 여백·폰트 크기 미세 조정
- 노션 대상(페이지/DB) 정해지면 이 요약을 해당 위치에 올리기
