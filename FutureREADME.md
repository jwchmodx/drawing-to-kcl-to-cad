1.현재 preview JSON을 geometry-friendly하게 확장
artifacts 외에, 간단한 메쉬(버텍스/인덱스)를 넣기.
프론트엔드에서 Three.js로 표시.
2. 프론트엔드에서 WASM KCL 엔진 로딩
kcl-wasm-lib를 번들에 포함하고,
parse/execute/recast를 React 컴포넌트에서 호출.
3. AST ↔ geometry 매핑 패턴 정립
태그/ID를 언어 규약으로 강제.
ArtifactGraph 구조를 표준화해서, 어떤 node가 어떤 AST에서 왔는지 추적 가능하게.
4. 
나중에 시간 여유가 생기면, modeling-app에서 쓰는 실제 WASM 바인딩을 찾아서 그 추상화 안에 꽂는 식으로 구현하는 게 안정적입니다.
4. 간단한 GUI 편집 도입
예: 슬라이더로 extrude 길이만 조정.
클릭한 artifact 선택 → 그에 대응하는 KCL 변수/리터럴만 수정.
5. 고급 피처 편집 / 조인트 / 충돌로 확장
아티팩트 그래프에 조인트/구속/충돌 정보까지 포함.
지금 고민하던 “joint / collision”은 이 위에서 천천히 올리기.


. 실제 LLM 클라이언트 구현 (필수)
현재 상태: DummyLLMClient만 존재 (실제 LLM 호출 없음)
필요한 작업:
[ ] Anthropic Claude API 클라이언트 구현
[ ] 이미지 + 텍스트 컨텍스트를 KCL 코드로 변환
[ ] 자연어 명령으로 KCL 코드 수정
[ ] API 키 환경변수 설정
[ ] 에러 처리 및 재시도 로직
2. 실제 KCL 런타임 통합 (필수)
현재 상태: kcl-run CLI 호출하지만 실제 CLI가 없음
프론트엔드:
  - KCL WASM 엔진
  - parse/execute/recast
  - 실시간 프리뷰
  - AST ↔ Geometry 매핑
백엔드:
  - LLM API만 (이미지 → KCL 코드 생성)
  Phase 1: WASM 통합
// frontend/lib/kclEngine.ts
import { KclEngine as WasmKclEngine } from '@kcl-lang/wasm-lib';

export const wasmKclEngine: KclEngine = {
  async parse(source: string) {
    const engine = await WasmKclEngine.init();
    return engine.parse(source);
  },
  // ...
};
// frontend/lib/kclEngine.tsimport { KclEngine as WasmKclEngine } from '@kcl-lang/wasm-lib';export const wasmKclEngine: KclEngine = {  async parse(source: string) {    const engine = await WasmKclEngine.init();    return engine.parse(source);  },  // ...};
Phase 2: 백엔드 제거
backend/kcl_runtime/ 제거 또는 선택적 사용
/convert, /modify는 LLM만 호출
프리뷰는 프론트엔드에서 생성

필요한 작업:
[ ] kcl-run CLI 설치 및 설정
[ ] 또는 KCL WASM 바인딩 직접 통합
[ ] KCL 실행 결과 파싱 및 검증
[ ] 에러 처리 (KCL 문법 오류 등)
1. 프론트엔드 KCL WASM 엔진 통합 (필수)
현재 상태: dummyKclEngine만 존재
필요한 작업:
[ ] kcl-wasm-lib 번들에 포함
[ ] 실제 parse, execute, recast 구현
[ ] ArtifactGraph 타입 정의 및 매핑
[ ] AST ↔ geometry 매핑 패턴 정립
1. 에러 처리 및 사용자 피드백 (필수)
현재 상태: 에러 처리 미흡
필요한 작업:
[ ] API 에러 처리 (네트워크, 서버 에러)
[ ] 로딩 상태 표시
[ ] 에러 메시지 사용자 친화적 표시
[ ] KCL 실행 에러 표시
1. 기본 UI/UX 개선 (중요)
현재 상태: 기본적인 UI만 존재
필요한 작업:
[ ] 로딩 스피너/인디케이터
[ ] 에러 메시지 표시 영역
[ ] 기본 스타일링 (CSS 또는 Tailwind)
[ ] 반응형 레이아웃
1. Preview JSON 확장 (중요)
FutureREADME.md에 따르면:
필요한 작업:
[ ] Preview JSON을 geometry-friendly하게 확장
[ ] Artifacts 외에 간단한 메쉬(버텍스/인덱스) 포함
[ ] 프론트엔드에서 Three.js로 표시 (일부 구현됨)
1. 환경 설정 및 배포 준비 (중요)
필요한 작업:
[ ] 환경변수 설정 파일 (.env.example)
[ ] Docker 설정 (선택)
[ ] 프로덕션 빌드 설정
[ ] CORS 설정 (프론트엔드-백엔드 통신)
1. 문서화 (권장)
필요한 작업:
[ ] API 문서 (FastAPI 자동 생성 가능)
[ ] 설정 가이드
[ ] 개발 환경 설정 가이드

GUI에서 합치기 (구현 필요)
두 artifact 선택 (Ctrl+클릭)
"합치기" 버튼 클릭
LLM이 KCL 코드에 union() 추가
또는 직접 union(artifact1, artifact2) 코드 생성
구현 로드맵
Phase 1: 선택 기능
[ ] 3D 뷰에서 ray casting으로 클릭 감지
[ ] ArtifactGraph에서 클릭된 geometry 찾기
[ ] 선택된 artifact 하이라이트
[ ] 선택된 artifact의 ID 표시
Phase 2: 매핑 시스템
[ ] ArtifactGraph에 AST 노드 참조 추가
[ ] ID/태그 기반 매핑 테이블 구축
[ ] 선택 → AST 노드 → 코드 위치 추적
Phase 3: GUI 편집
[ ] 선택된 artifact의 파라미터 추출
[ ] 슬라이더/입력 필드로 값 변경
[ ] 변경사항을 KCL 코드에 반영
[ ] 실시간 프리뷰 업데이트
Phase 4: 고급 편집
[ ] 다중 선택 (Ctrl+클릭)
[ ] Boolean 연산 UI (합치기, 빼기, 교집합)
[ ] Transform UI (이동, 회전, 스케일)