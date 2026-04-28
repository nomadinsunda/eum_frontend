# CS 도메인 (고객센터)

기준일: 2026-04-28

## 개요

고객센터 페이지. 전화 상담 정보, AI 채팅 상담, 공지사항/FAQ 링크로 구성된다.
AI 채팅 상담은 `ragserver`의 RAG(Retrieval-Augmented Generation) 기반으로 구현한다.

---

## 구성 요소

| 섹션 | 설명 |
|---|---|
| 전화 상담 | 032-212-2202, 평일 10:00~18:00 (점심 13:00~14:00) |
| AI 상담 | `useRagChatMutation` 으로 ragserver 연동 |
| 커뮤니티 | NOTICE (`/notice`), FAQ (`/faq`) 링크 |

---

## 공통 응답 포맷

모든 ragserver 응답은 `ApiResponse<T>` 래퍼로 감싸진다.

```json
{
  "code": "SUCCESS",
  "message": "Request processed successfully.",
  "data": {},
  "timestamp": "2026-04-28T03:41:22.1054244Z"
}
```

> `transformResponse: (res) => res.data ?? res` 패턴으로 `data` 필드를 추출한다.

### 에러 응답

```json
{
  "code": "COMMON-401",
  "message": "Validation failed.",
  "path": "/rag/chat",
  "timestamp": "2026-04-28T03:41:22.1054244Z"
}
```

| 에러 코드 | 의미 | 프론트 메시지 |
|---|---|---|
| `COMMON-400` | 잘못된 요청 | 기본 오류 메시지 |
| `COMMON-401` | 검증 실패 | 기본 오류 메시지 |
| `COMMON-404` | 리소스 없음 | 기본 오류 메시지 |
| `AI-429` | Gemini quota 초과 | "AI 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." |
| `LLM-502` | LLM 응답 생성 실패 | "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." |
| `EMB-502` | 임베딩 생성 실패 | "질문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." |
| `COMMON-500` | 내부 서버 오류 | 기본 오류 메시지 |

기본 오류 메시지: `"죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."`

---

## API 엔드포인트 (`src/api/ragApi.js`)

게이트웨이 라우팅: `/api/v1/rag/**` → `RAGSERVER` (RewritePath: `/rag/`)
인증 필요 (게이트웨이 whitelist 미포함).

### Queries

| 훅 | 메서드 | 경로 | 설명 |
|---|---|---|---|
| `useGetSessionHistoryQuery(sessionId)` | GET | `/rag/sessions/{sessionId}` | 세션 이력 조회 (대화 복원용) |

#### `useGetSessionHistoryQuery` 응답 구조 (transformResponse 적용 후)

```js
{
  sessionId: string,
  messageCount: number,
  messages: [
    {
      role: 'USER' | 'ASSISTANT',
      content: string,
      timestamp: number,   // epoch millis
    }
  ]
}
```

### Mutations

| 훅 | 메서드 | 경로 | 설명 |
|---|---|---|---|
| `useRagChatMutation` | POST | `/rag/chat` | AI 채팅 상담 |

#### `useRagChatMutation` 요청

```json
{
  "sessionId": "string (optional — 첫 요청은 생략, 서버가 생성해 반환)",
  "question": "string (필수, NotBlank)"
}
```

#### `useRagChatMutation` 응답 (transformResponse 적용 후)

```js
{
  sessionId: string,
  rewrittenQuestion: string,
  answer: string,
  sources: [
    {
      documentId: string,
      filename: string,
      chunkId: string,
      snippet: string,
      score: number,
    }
  ]
}
```

---

## AI 채팅 로컬 상태 (`CSPage.jsx`)

```js
messages: [{ role: 'user'|'assistant', text: string, sources?: SourceItem[] }]
sessionId: string | null   // 대화 연속성용, 서버 반환값 보관
input: string              // 현재 입력 텍스트
```

> `messages`의 `role`은 프론트 표시용 소문자(`'user'|'assistant'`).
> 서버 `SessionHistoryResponse`의 `role`은 대문자(`'USER'|'ASSISTANT'`).

---

## UI 규칙

- 사용자 메시지: 오른쪽 정렬, `#3ea76e` 배경, 흰색 텍스트
- AI 응답: 왼쪽 정렬, `#f9f9f9` 배경, `#333` 텍스트
- 출처(`sources`): AI 응답 아래 항상 표시. `filename` + `snippet` 표시.
- 전송: Enter 키 또는 버튼 클릭 (Shift+Enter는 줄바꿈)
- 빈 입력 전송 불가. AI 응답 대기 중 입력창·버튼 비활성화.
- 에러 시 에러 코드 기반 메시지를 assistant 버블로 표시.

---

## 캐시 무효화 전략

`ragChat`은 mutation-only이므로 `invalidatesTags` 없음.
`getSessionHistory`는 `{ type: 'Rag', id: sessionId }`로 태그.
