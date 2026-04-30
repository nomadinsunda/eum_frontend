import { apiSlice } from './apiSlice'

// Board Server GET /notices/{noticeId} 확정 응답 기준 (2026-04-24)
const normalizeNoticeDetail = (n) => ({
  id:        n.id,
  category:  n.category          ?? '',
  title:     n.title             ?? '',
  isPinned:  n.isPinned          ?? false,
  images:    n.contentImageUrls  ?? [],
  actions:   n.actions           ?? [],
  content:   n.content           ?? '',
  createdAt: n.createdAt         ?? null,
  updatedAt: n.updatedAt         ?? null,
})

export const noticeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    /** 공지 상세 — GET /notices/{noticeId} */
    getNoticeDetail: builder.query({
      query: (id) => `/notices/${id}`,
      transformResponse: (res) => normalizeNoticeDetail(res.data ?? res),
      providesTags: (result, error, id) => [{ type: 'Notice', id }],
    }),

  }),
})

export const {
  useGetNoticeDetailQuery,
} = noticeApi
