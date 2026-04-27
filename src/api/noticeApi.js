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

// Board Server GET /faqs/{faqId} 확정 응답 기준 (2026-04-24)
const normalizeFaqDetail = (f) => ({
  id:        f.id,
  category:  f.category          ?? 'FAQ',
  title:     f.title             ?? '',
  isPinned:  f.isPinned          ?? false,
  images:    f.contentImageUrls  ?? [],
  actions:   f.actions           ?? [],
  content:   f.content           ?? '',
  author:    f.author            ?? '',
  viewCount: f.viewCount         ?? 0,
  createdAt: f.createdAt         ?? null,
  updatedAt: f.updatedAt         ?? null,
})

export const noticeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    /** 공지 상세 — GET /notices/{noticeId} */
    getNoticeDetail: builder.query({
      query: (id) => `/notices/${id}`,
      transformResponse: (res) => normalizeNoticeDetail(res.data ?? res),
      providesTags: (result, error, id) => [{ type: 'Notice', id }],
    }),

    /** FAQ 상세 — GET /faqs/{faqId} */
    getFaqDetail: builder.query({
      query: (id) => `/faqs/${id}`,
      transformResponse: (res) => normalizeFaqDetail(res.data ?? res),
      providesTags: (result, error, id) => [{ type: 'FAQ', id }],
    }),

  }),
})

export const {
  useGetNoticeDetailQuery,
  useGetFaqDetailQuery,
} = noticeApi
