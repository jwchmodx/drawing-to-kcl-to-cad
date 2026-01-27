1.현재 preview JSON을 geometry-friendly하게 확장
artifacts 외에, 간단한 메쉬(버텍스/인덱스)를 넣기.
프론트엔드에서 Three.js로 표시.
2. 프론트엔드에서 WASM KCL 엔진 로딩
kcl-wasm-lib를 번들에 포함하고,
parse/execute/recast를 React 컴포넌트에서 호출.
3. AST ↔ geometry 매핑 패턴 정립
태그/ID를 언어 규약으로 강제.
ArtifactGraph 구조를 표준화해서, 어떤 node가 어떤 AST에서 왔는지 추적 가능하게.
4. 간단한 GUI 편집 도입
예: 슬라이더로 extrude 길이만 조정.
클릭한 artifact 선택 → 그에 대응하는 KCL 변수/리터럴만 수정.
5. 고급 피처 편집 / 조인트 / 충돌로 확장
아티팩트 그래프에 조인트/구속/충돌 정보까지 포함.
지금 고민하던 “joint / collision”은 이 위에서 천천히 올리기.