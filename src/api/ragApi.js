import { apiSlice } from './apiSlice'

export const ragApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    ragChat: builder.mutation({
      query: (body) => ({ url: '/rag/chat', method: 'POST', body }),
    }),
  }),
})

export const { useRagChatMutation } = ragApi
