# Notion MCP 설정 (Cursor 설정 UI)

## 방법 1: Cursor 설정 UI (권장)

1. **Cursor** → **Settings** (또는 **Preferences**)
2. **MCP** (또는 **Features** → **MCP Servers**) 이동
3. **Add new MCP server** 클릭
4. 아래 값 입력:

| 필드   | 값 |
|--------|----|
| **Command** | `npx` |
| **Args**    | `-y` |
|             | `mcp-remote` |
|             | `https://mcp.notion.com/mcp` |

5. 저장 후 **Cursor 재시작**
6. 첫 사용 시 브라우저에서 **Notion OAuth 로그인** → 연결할 워크스페이스 선택·승인

---

### Args 입력 예시 (한 줄씩)

```
-y
mcp-remote
https://mcp.notion.com/mcp
```

(Args가 배열이면 위 세 값을 각각 추가)
