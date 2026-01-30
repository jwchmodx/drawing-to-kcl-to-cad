# 테스트 문서

## 개요

이 프로젝트는 Test-Driven Development (TDD) 원칙에 따라 작성되었습니다. 모든 기능은 테스트를 먼저 작성한 후 구현되었습니다.

## 테스트 구조

### Backend 테스트 (`backend/tests/`)

- **test_llm_client.py**: LLM 클라이언트 인터페이스 및 모킹 테스트
- **test_storage.py**: KCL 코드 저장소 테스트
- **test_api_endpoints.py**: FastAPI 엔드포인트 통합 테스트
- **test_integration.py**: 전체 시스템 통합 테스트 (이미지 업로드 → KCL 변환 → 수정 플로우)

### Frontend 테스트 (`frontend/__tests__/`)

- **kclEngine.test.ts**: KCL 엔진 추상화 테스트
- **wasmKclEngine.test.ts**: WASM 기반 KCL 엔진 테스트 (`invokeKCLRun` 결과 파싱 포함)
- **wasmLoader.test.ts**: KCL WASM 모듈 로더 단위 테스트 (싱글톤/에러/네트워크)
- **artifactGraph.test.ts**: `ArtifactGraph` 및 `parseKclRunOutput`/`extractMeshes`/`buildArtifactGraphFromGeometry` 유틸 테스트
- **geometryRuntime.test.ts**: TypeScript 기하 런타임 테스트 (`buildGeometrySpecFromKcl` - KCL 코드 패턴 파싱)
- **astMapping.test.ts**: AST 노드 ↔ 기하 매핑 유틸 테스트
- **useKclModel.test.tsx**: KCL 모델 관리 React 훅 테스트
- **KclPreview3D.test.tsx**: 3D 미리보기 컴포넌트 테스트 (Three.js/WebGL 방어 포함, 카메라 핏 및 OrbitControls 통합 테스트)
- **threeCameraUtils.test.ts**: 카메라 유틸리티 테스트 (bbox 계산 및 카메라 파라미터 계산)
- **ImageUpload.test.tsx**: 이미지 업로드 컴포넌트 테스트
- **KclEditor.test.tsx**: KCL 코드 에디터 컴포넌트 테스트
- **CommandInput.test.tsx**: 명령어 입력 컴포넌트 테스트 (파일 첨부 onAttachFile 포함)
- **PanelResizer.test.tsx**: 패널 리사이저 드래그 테스트 (onDrag, deltaX)
- **layoutPanels.test.tsx**: 3열 레이아웃, 패널 토글, 리사이저 존재, 프리뷰 flex-1, 채팅 첨부 버튼
- **page.test.tsx**: 메인 페이지 통합 테스트
- **integration.test.tsx**: 전체 프론트엔드 플로우 통합 테스트
- **errorHandling.test.tsx**: 에러 처리 유틸리티 및 컴포넌트 테스트

## 테스트 실행 방법

### Backend 테스트

```bash
cd backend
PYTHONPATH=.. python -m pytest tests/ -v
```

통합 테스트만 실행:

```bash
cd backend
PYTHONPATH=.. python -m pytest tests/test_integration.py -v
```

커버리지 리포트 포함:

```bash
cd backend
PYTHONPATH=.. python -m pytest tests/ --cov=backend --cov-report=html
```

### Frontend 테스트

```bash
cd frontend
npm test
```

통합 테스트만 실행:

```bash
cd frontend
npm test -- --testPathPattern="integration.test.tsx"
```

커버리지 리포트 포함:

```bash
cd frontend
npm run test:coverage
```

### 전체 통합 테스트 실행

백엔드와 프론트엔드 통합 테스트를 모두 실행:

```bash
# Backend integration tests
cd backend
PYTHONPATH=.. python -m pytest tests/test_integration.py -v

# Frontend integration tests
cd ../frontend
npm test -- --testPathPattern="integration.test.tsx"
```

## 커버리지 목표

- **Business Logic**: ≥80% (lib/, backend/)
- **API Layer**: ≥70% (app/, backend/main.py)
- **Components**: Integration 테스트 우선 (커버리지보다 동작 검증)

## TDD 워크플로우

### Red-Green-Refactor 사이클

1. **RED**: 실패하는 테스트 작성
   - 새로운 기능에 대한 테스트를 먼저 작성
   - 테스트가 실패하는 것을 확인

2. **GREEN**: 최소한의 코드로 테스트 통과
   - 테스트를 통과시키기 위한 최소한의 코드만 작성
   - 추가 기능은 작성하지 않음

3. **REFACTOR**: 코드 품질 개선
   - 테스트가 통과하는 상태를 유지하면서 코드 개선
   - 중복 제거, 가독성 향상, 성능 최적화

### 테스트 작성 패턴

#### Arrange-Act-Assert (AAA) 패턴

```typescript
it('should do something', () => {
  // Arrange: 테스트 데이터 및 의존성 설정
  const input = 'test data';
  
  // Act: 테스트 대상 실행
  const result = functionUnderTest(input);
  
  // Assert: 결과 검증
  expect(result).toBe('expected');
});
```

#### Given-When-Then (BDD 스타일)

```typescript
it('should behave in specific way', () => {
  // Given: 초기 상태
  const component = render(<Component />);
  
  // When: 액션 발생
  fireEvent.click(component.getByRole('button'));
  
  // Then: 예상 결과
  expect(component.getByText('result')).toBeInTheDocument();
});
```

## 에지 케이스 테스트

다음 에지 케이스들이 테스트에 포함되어 있습니다:

### Backend
- 빈 입력값 처리 (빈 이미지, null context)
- 매우 긴 코드 문자열 처리
- 특수 문자 및 유니코드 처리
- JSON 파싱 실패 처리
- Subprocess 실행 실패 처리
- API 에러 응답 처리

### Frontend
- null/undefined 값 처리
- 빈 문자열 처리
- 매우 긴 입력값 처리
- 파일 선택 취소
- 잘못된 파일 형식
- 네트워크 에러 처리
- API 에러 응답 처리
- WASM 실행 결과 파싱 실패 및 KCL 구문 에러 처리
- TypeScript 기하 런타임 에지 케이스:
  - 빈 KCL 코드
  - 주석 및 공백 라인 포함 코드
  - 잘못된 box 정의 (누락된 파라미터, NaN 값)
  - 매우 큰/작은/음수 크기 값
  - float 값 처리
  - 다양한 whitespace 패턴

## 모킹 및 스텁

### Backend
- **LLM Client**: `FakeLLM` 클래스로 실제 API 호출 방지
- **Storage**: `InMemoryKclStorage`로 데이터베이스 없이 테스트

### Frontend
- **Fetch API**: `global.fetch`를 jest.fn()으로 모킹
- **Three.js**: WebGL 컨텍스트 모킹 (테스트 환경에서 WebGL 미지원)
- **requestAnimationFrame**: jest.fn()으로 모킹

## 테스트 실행 시간

- **Backend**: < 2초
- **Frontend**: < 5초

## 품질 게이트

각 Phase 완료 전 다음 항목들을 확인합니다:

- [ ] 모든 테스트 통과 (100%)
- [ ] 커버리지 목표 달성
- [ ] Linting 통과
- [ ] 타입 체크 통과
- [ ] 기존 테스트 회귀 없음

## 참고 사항

### Three.js 테스트

`KclPreview3D` 컴포넌트는 Three.js를 사용하므로, 테스트 환경에서 WebGL 컨텍스트를 모킹해야 합니다. `jest.setup.ts`에 WebGL 모킹이 포함되어 있습니다.

### Async 테스트

Backend의 async 함수들은 `pytest-asyncio`를 사용하여 테스트합니다. `@pytest.mark.anyio` 데코레이터를 사용합니다.

### FastAPI 테스트

FastAPI 엔드포인트는 `TestClient`를 사용하여 테스트합니다. 실제 HTTP 서버를 시작하지 않고도 테스트할 수 있습니다.

## 문제 해결

### 테스트가 실패하는 경우

1. 모든 의존성이 설치되어 있는지 확인
2. 환경 변수가 올바르게 설정되어 있는지 확인
3. 모킹이 올바르게 설정되어 있는지 확인
4. 테스트 데이터가 올바른지 확인

### 커버리지가 낮은 경우

1. 누락된 분기(branch) 확인
2. 에러 핸들링 경로 테스트 추가
3. 에지 케이스 테스트 추가

## 통합 테스트

### Backend 통합 테스트 (`test_integration.py`)

전체 시스템 플로우를 검증하는 통합 테스트:

- **TestImageUploadToKCLFlow**: 이미지 업로드부터 KCL 코드 생성까지의 전체 플로우
  - 이미지 업로드 → KCL 변환 → 코드 반환
  - 컨텍스트 파라미터 포함/미포함 시나리오
  - 저장소 지속성 검증

- **TestKCLModificationFlow**: KCL 코드 수정 플로우
  - 단일 수정 명령어 처리
  - 다중 순차 수정 처리

- **TestErrorHandlingFlow**: 에러 처리 통합 테스트
  - 파일 누락 에러
  - 필수 파라미터 누락 에러
  - 빈 값 처리

- **TestCORSIntegration**: CORS 헤더 통합 검증
  - `/convert` 엔드포인트 CORS 헤더
  - `/modify` 엔드포인트 CORS 헤더

### Frontend 통합 테스트 (`integration.test.tsx`)

프론트엔드 전체 사용자 플로우를 검증:

- **Image Upload to KCL Conversion Flow**: 이미지 업로드부터 에디터 표시까지
- **KCL Modification Flow**: KCL 코드 수정 및 프리뷰 재생성
- **Error Handling Integration**: 네트워크 에러 및 서버 에러 처리
- **Preview Generation Integration**: KCL 코드 변경 시 WASM 엔진을 통해 `ArtifactGraph`를 생성하고, 이를 기반으로 자동 프리뷰(메쉬 데이터) 생성
  - WASM 엔진이 빈 그래프를 반환할 경우, TypeScript 기하 런타임(`buildGeometrySpecFromKcl`)이 KCL 코드 패턴을 파싱하여 fallback으로 기하 데이터 생성
  - `KclPreview3D` 컴포넌트는 메쉬의 bounding box를 계산하여 자동으로 카메라를 맞추고, OrbitControls를 통해 마우스 인터랙션(회전/줌/팬)을 지원

## 향후 개선 사항

- [ ] E2E 테스트 추가 (Playwright 또는 Cypress) - 실제 브라우저에서 전체 플로우 테스트
- [ ] 성능 테스트 추가
- [ ] 부하 테스트 추가
- [ ] 시각적 회귀 테스트 추가


