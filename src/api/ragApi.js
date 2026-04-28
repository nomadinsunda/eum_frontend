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

    /** 하이브리드 검색 — POST /rag/search */
    hybridSearch: builder.mutation({
      query: (body) => ({ url: '/rag/search', method: 'POST', body }),
      transformResponse: (res) => res.data ?? res,
    }),

    /** 문서 업로드 — POST /rag/documents (multipart/form-data) */
    uploadDocument: builder.mutation({
      query: ({ file, documentId, category }) => {
        const formData = new FormData()
        formData.append('file', file)
        if (documentId) formData.append('document_id', documentId)
        if (category) formData.append('category', category)
        return { url: '/rag/documents', method: 'POST', body: formData }
      },
      transformResponse: (res) => res.data ?? res,
    }),

    /** 문서 상태 조회 — GET /rag/documents/{documentId} */
    getDocumentStatus: builder.query({
      query: (documentId) => ({ url: `/rag/documents/${documentId}` }),
      transformResponse: (res) => res.data ?? res,
      providesTags: (result, error, documentId) => [{ type: 'Rag', id: `DOC_${documentId}` }],
    }),

    /** 청크 미리보기 — GET /rag/documents/{documentId}/chunks */
    getDocumentChunks: builder.query({
      query: (documentId) => ({ url: `/rag/documents/${documentId}/chunks` }),
      transformResponse: (res) => res.data ?? res,
      providesTags: (result, error, documentId) => [{ type: 'Rag', id: `CHUNKS_${documentId}` }],
    }),

  }),
})

export const {
  useRagChatMutation,
  useGetSessionHistoryQuery,
  useHybridSearchMutation,
  useUploadDocumentMutation,
  useGetDocumentStatusQuery,
  useGetDocumentChunksQuery,
} = ragApi
