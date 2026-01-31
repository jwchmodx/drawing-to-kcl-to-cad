# Notion MCP 도구 파라미터 참고

실제 호출로 확인한 Notion MCP 파라미터 형식이다. 스킬 사용 시 **이 형식을 그대로 따르면** 페이지 생성·본문 수정이 성공한다.

---

## ⚠️ 알려진 한계: 페이지가 워크스페이스 최상위에 생성됨

**현상**: `notion-create-pages`에 `database_id`(DB 블록 ID 또는 collection ID)를 넘겨도, Notion MCP가 **새 페이지를 워크스페이스 최상위**에 만드는 경우가 있다. "Drawing to CAD" 페이지 안의 "개발 PRD" 테이블에 넣고 싶어도, 새 항목이 사이드바 최상위나 All에만 보일 수 있다.

**이유**: MCP 서버 구현이 Notion API의 `parent: { database_id }`를 그대로 쓰지 않거나, 생성 후 위치를 다르게 처리하는 것으로 추정된다. 사용자 측에서 MCP 코드를 바꿀 수 없다면 아래 **올바르게 넣는 방법**으로 보정해야 한다.

---

## ✅ 올바르게 넣는 방법 (사용자 측)

대상이 **특정 페이지 안의 DB**(예: Drawing to CAD → 개발 PRD)일 때, 다음 중 하나를 하면 된다.

### 방법 A: 생성 후 노션에서 위치 옮기기 (권장)

1. AI가 MCP로 페이지를 생성한 뒤, 생성된 페이지 URL(또는 제목)을 확인한다.
2. **Notion**에서 해당 페이지를 연다.
3. 페이지 우측 상단 **⋯** → **Move to** (이동)를 선택한다.
4. **Drawing to CAD (LLM 3D 모델링 툴)** 페이지를 연 다음, 아래로 스크롤해 **개발 PRD** 데이터베이스 블록을 찾는다.
5. **개발 PRD** 테이블 뷰에서 **+ New**로 새 행을 하나 만든다.
6. 방금 만든(워크스페이스 최상위에 있는) 페이지를 **드래그해서** 이 "개발 PRD" 테이블 **안의 행**으로 끌어넣거나, 또는 새 행의 제목 셀에 기존 페이지를 **링크로 연결**하는 방식으로 옮긴다. (Notion 버전에 따라 "Move to"에서 직접 해당 DB를 선택할 수 있으면, 그 DB를 선택해 이동해도 된다.)

이렇게 하면 해당 페이지가 **Drawing to CAD 페이지 안의 개발 PRD**에만 보인다.

### 방법 B: DB에서 직접 새 행 만들고 내용 붙여넣기

1. **Notion**에서 **Drawing to CAD (LLM 3D 모델링 툴)** 페이지를 연다.
2. 아래로 스크롤해 **개발 PRD** 데이터베이스 블록을 연다.
3. 테이블에서 **+ New**로 새 행을 만든다.
4. AI에게 "위 개발 PRD에 넣을 완료 요약 마크다운만 출력해줘"라고 요청해, **마크다운 본문**을 받는다.
5. 새 행의 제목을 입력한 뒤, 행을 클릭해 페이지를 열고, 본문에 받은 마크다운을 **붙여넣기**한다.

이 방법은 MCP로 페이지를 만들지 않으므로, 처음부터 **해당 DB 안**에만 행이 생긴다.

---

## 1. 페이지 생성: `notion-create-pages`

**DB에 새 페이지를 만들 때** 사용한다.

- **상위 인자**
  - `database_id` (string): 대상 **데이터 소스(collection) ID**. 페이지 안에 들어 있는 DB 블록(예: Drawing to CAD 페이지 아래 "개발 PRD")에 넣으려면, `notion-fetch`(해당 페이지)로 DB 블록의 **data-source url**을 확인한 뒤 `collection://...` 에서 UUID만 사용한다. (DB 블록 id를 쓰면 새 페이지가 워크스페이스 최상위에 보일 수 있음.)
  - `pages` (array): 생성할 페이지 객체 배열.

- **각 페이지 객체**
  - `properties` (object) **만** 사용한다. `parent` 키는 **사용하지 않는다** (unrecognized).
  - 제목 속성: DB 스키마에 따라 다름. 예: `"이름"`(title 타입)이면 `properties: { "이름": "<문자열 제목>" }` 처럼 **문자열 하나**로 넘긴다. (Notion API처럼 `title: [{ text: { content: "..." } }]` 객체 형태가 아님.)

**예시 (Drawing to CAD 페이지 안 개발 PRD에 완료 요약 페이지 생성 — data source ID 사용)**

```json
{
  "database_id": "2f89589f-b79f-80c9-b8a0-000b81dfb6f5",
  "pages": [
    {
      "properties": {
        "이름": "[완료 요약] UI code.html 레이아웃 맞추기 - 2025-01-30"
      }
    }
  ]
}
```

- 응답에 `pages[].id`, `pages[].url` 이 오면 성공. 이 `id`를 본문 수정 시 사용한다.

---

## 2. 본문 수정: `notion-update-page`

**이미 만든 페이지의 본문을 채우거나 바꿀 때** 사용한다.

- **인자**
  - `id` (string): 수정할 페이지 ID (create-pages 응답의 `pages[].id`).
  - `data` (object): **필수**. 아래 중 하나의 명령 형태.

- **본문 전체 치환: `replace_content`**
  - `data`:
    - `page_id` (string): 수정할 페이지 ID (위 `id`와 동일).
    - `command` (string): `"replace_content"`.
    - `new_str` (string): 새 본문 텍스트. 마크다운/플레인 텍스트. 줄바꿈은 `\n`.

**예시**

```json
{
  "id": "2f89589f-b79f-81a8-9f7f-e34034fbfc99",
  "data": {
    "page_id": "2f89589f-b79f-81a8-9f7f-e34034fbfc99",
    "command": "replace_content",
    "new_str": "## 완료 범위\n\n- Phase 1: ...\n- Phase 2: ...\n\n## 산출물\n\n..."
  }
}
```

- 그 외 `data` 명령(예: `update_properties`, `insert_content_after` 등)은 툴 스키마를 참고한다.

---

## 3. DB 스키마 확인: `notion-fetch`

대상 DB의 **제목 속성 이름**을 모를 때 `notion-fetch`로 DB를 조회한다.

- `id`: 데이터베이스 ID 또는 URL.
- 응답의 `data-source-state` / `schema` 에서 title 타입 속성 이름(예: `"이름"`)을 확인한 뒤, create-pages의 `properties` 키로 사용한다.

---

## 4. 검색: `notion-search`

페이지/DB를 **제목·키워드로 찾을 때** 사용한다.

- `query` (string): 검색어 (예: `"개발 PRD"`, `"Drawing to CAD"`).
- 응답 `results[]` 에서 `id`, `title`, `type`(page | database), `url` 확인.

---

## 요약 체크리스트 (업로드 시)

1. **대상 DB ID**: 사용자가 지정한 노션 대상이 **페이지 안의 DB 블록**(예: Drawing to CAD → 개발 PRD)이면, 해당 페이지를 `notion-fetch`로 조회해 DB 블록의 **data-source url**에서 collection UUID를 `database_id`로 사용. 그렇지 않으면 `notion-search` / `notion-fetch`로 DB id 확보.
2. **제목 속성 이름**: `notion-fetch`(DB id)로 스키마 확인 → title 속성 이름(예: `"이름"`).
3. **페이지 생성**: `notion-create-pages` 에 `database_id` + `pages: [{ properties: { "<title속성명>": "제목 문자열" } }]` 만 전달.
4. **본문 채우기**: 응답의 `pages[0].id` 로 `notion-update-page` 호출, `data: { page_id, command: "replace_content", new_str }` 로 본문 넣기.
5. **위치 보정**: MCP가 페이지를 워크스페이스 최상위에 만든 경우, 사용자에게 **"올바르게 넣는 방법"**을 안내한다. (생성된 페이지 → Move to → Drawing to CAD 페이지 안 개발 PRD 테이블로 이동, 또는 DB에서 직접 새 행 만들고 본문 붙여넣기.)
