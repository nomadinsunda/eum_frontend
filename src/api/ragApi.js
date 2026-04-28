import { apiSlice } from './apiSlice'

export const ragApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    /** AI 채팅 상담 — POST /rag/chat */
    ragChat: builder.mutation({
      query: (body) => ({ url: '/rag/chat', method: 'POST', body }),
      transformResponse: (res) => res.data ?? res,
    }),

    /** 세션 이력 조회 — GET /rag/sessions/{sessionId} */
    getSessionHistory: builder.query({
      query: (sessionId) => ({ url: `/rag/sessions/${sessionId}` }),
      transformResponse: (res) => res.data ?? res,
      providesTags: (result, error, sessionId) => [{ type: 'Rag', id: sessionId }],
    }),

  }),
})

export const { useRagChatMutation, useGetSessionHistoryQuery } = ragApi
