import { apiSlice } from './apiSlice'

export const paymentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    /** 결제 준비 — 주문 생성 후 Toss 위젯 requestPayment 호출 전에 실행 */
    preparePayment: builder.mutation({
      query: (body) => ({ url: '/payments/prepare', method: 'POST', body }),
      transformResponse: (res) => res.data ?? res,
    }),

    /** 결제 승인 — Toss successUrl 리다이렉트 후 실행 */
    confirmPayment: builder.mutation({
      query: (body) => ({ url: '/payments/confirm', method: 'POST', body }),
      transformResponse: (res) => res.data ?? res,
      invalidatesTags: [{ type: 'Order', id: 'LIST' }, { type: 'Cart', id: 'LIST' }],
    }),

    /** 결제 상태 SSE 구독 — confirmPayment 트리거 후 payment-status 이벤트 수신 */
    subscribePaymentEvents: builder.query({
      queryFn: () => ({ data: { status: null } }),
      async onCacheEntryAdded(orderId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        const es = new EventSource(
          `${import.meta.env.VITE_API_BASE_URL}/payments/orders/${orderId}/events`,
          { withCredentials: true }
        )
        try {
          await cacheDataLoaded
          es.addEventListener('payment-status', (e) => {
            try {
              const data = JSON.parse(e.data)
              updateCachedData(() => data)
              if (data.status === 'PAID' || data.status === 'FAILED') es.close()
            } catch {}
          })
          es.onerror = () => es.close()
        } catch {
          es.close()
        }
        await cacheEntryRemoved
        es.close()
      },
    }),

  }),
})

export const {
  usePreparePaymentMutation,
  useConfirmPaymentMutation,
  useSubscribePaymentEventsQuery,
} = paymentApi
