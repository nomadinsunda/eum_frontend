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

## AI 채팅 상담

### API 엔드포인트 (`src/api/ragApi.js`)

`apiSlice.injectEndpoints()`로 정의.

| 훅 | 메서드 | 경로 | 설명 |
|---|---|---|---|
| `useRagChatMutation` | POST | `/rag/chat` | AI 채팅 상담. 인증 필요. |

> 게이트웨이 라우팅: `/api/v1/rag/**` → `RAGSERVER` (RewritePath: `/rag/`)

### 요청 구조

```json
{
  "sessionId": "string (optional — 첫 요청은 생략, 서버가 생성해 반환)",
  "question": "string (필수, NotBlank)"
}
```

### 응답 구조

```json
{
  "code": "SUCCESS",
  "data": {
    "sessionId": "string",
    "rewrittenQuestion": "string",
    "answer": "string",
    "sources": [
      {
        "documentId": "string",
        "filename": "string",
        "chunkId": "string",
        "snippet": "string",
        "score": 0.95
      }
    ]
  }
}
```

> `transformResponse` 없이 `result.data ?? result` 패턴으로 파싱.

### 로컬 상태 (`CSPage.jsx`)

```js
messages: [{ role: 'user'|'assistant', text: string, sources?: SourceItem[] }]
sessionId: string | null   // 대화 연속성용, 서버 반환값 보관
input: string              // 현재 입력 텍스트
```

### UI 규칙

- 사용자 메시지: 오른쪽 정렬, `#3ea76e` 배경, 흰색 텍스트
- AI 응답: 왼쪽 정렬, `#f9f9f9` 배경, `#333` 텍스트
- 출처(`sources`): AI 응답 아래 항상 표시. `filename` + `snippet` 표시.
- 전송: Enter 키 또는 버튼 클릭 (Shift+Enter는 줄바꿈)
- 빈 입력 전송 불가. AI 응답 대기 중 입력창·버튼 비활성화.
- 오류 시 고정 에러 메시지 assistant 버블로 표시.

---

## 캐시 무효화 전략

mutation-only 도메인이므로 `invalidatesTags` 없음.

---

## tagTypes

`apiSlice.js`의 `tagTypes`에 `"Rag"` 추가 (일관성 유지).
