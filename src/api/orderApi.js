import { apiSlice } from './apiSlice'
import { setLastCreatedOrder } from '@/features/order/orderSlice'

const normalizeOrder = (o) => ({
  id: o.order_id ?? o.orderId ?? o.id,
  date: typeof o.time === 'string'
    ? o.time.replace('T', ' ').slice(0, 19)
    : typeof o.createdAt === 'string'
      ? o.createdAt.replace('T', ' ').slice(0, 19)
      : (o.date ?? ''),
  status: o.order_state ?? o.orderStatus ?? o.status,
  ordererName: o.user_name ?? o.receiver_name ?? o.ordererName ?? o.buyerName ?? o.memberName ?? '',
  paymentMethod: o.payment_method ?? o.paymentMethod ?? o.paymentType ?? '',
  itemCount: o.total_item_count ?? null,
  paidAmount: o.paid_amount ?? o.paidAmount ?? 0,
  couponDiscount: o.couponDiscountAmount ?? o.couponDiscount ?? 0,
  failedReason: o.failed_reason ?? null,
  failedAt: o.failed_at ?? null,
  items: (o.items ?? []).map((item) => ({
    productId: item.product_id ?? item.productId,
    optionId: item.option_id ?? item.optionId ?? null,
    name: item.product_name ?? item.productName ?? item.name,
    option: item.option_name ?? item.optionName ?? item.option ?? '',
    qty: item.quantity ?? item.qty ?? 1,
    price: item.price ?? 0,
    totalPrice: item.total_price ?? item.totalPrice ?? 0,
    img: item.imageUrl ?? item.img ?? null,
    trackingNo: item.trackingNumber ?? item.trackingNo ?? '',
    company: item.deliveryCompany ?? item.company ?? '',
    itemStatus: item.itemStatus ?? item.status ?? o.order_state ?? o.orderStatus ?? '',
  })),
  productPrice: o.product_total_price ?? o.amount ?? o.productAmount ?? o.productPrice ?? 0,
  shippingPrice: o.shippingFee ?? o.shippingPrice ?? 0,
  discountPrice: o.discountAmount ?? o.discountPrice ?? 0,
  total: o.amount ?? o.totalAmount ?? o.total ?? 0,
  address: {
    recipient: o.receiver_name ?? o.recipientName ?? o.receiver ?? '',
    zipCode: o.zipCode ?? o.postCode ?? '',
    address: o.receiver_addr ?? o.address ?? o.roadAddress ?? '',
    phone: o.receiver_phone ?? o.recipientPhone ?? o.receiverPhone ?? o.phone ?? '',
    memo: o.deliveryMemo ?? o.orderMemo ?? o.memo ?? '',
  },
})

export const orderApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    /** 주문 목록 — params: { start_date?, end_date?, status?, page? } */
    getOrders: builder.query({
      query: (params) => ({ url: '/orders', params }),
      transformResponse: (res) => {
        const raw = res.content ?? res.data?.content ?? []
        return {
          content: raw.map(normalizeOrder),
          totalPages: res.totalPages ?? res.data?.totalPages ?? 1,
          totalElements: res.totalElements ?? res.data?.totalElements ?? raw.length,
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({ type: 'Order', id })),
              { type: 'Order', id: 'LIST' },
            ]
          : [{ type: 'Order', id: 'LIST' }],
    }),

    /** 주문 상세 — 아이템 목록 포함 */
    getOrderById: builder.query({
      query: (orderId) => ({ url: `/orders/${orderId}` }),
      transformResponse: (res) => normalizeOrder(res.data ?? res),
      providesTags: (result, error, orderId) => [{ type: 'Order', id: orderId }],
    }),

    /** 내 주문 상품 이력 (item 단위) — GET /orders/me/history */
    getOrderHistory: builder.query({
      query: () => ({ url: '/orders/me/history' }),
      transformResponse: (res) => {
        if (!res) return []
        const list = Array.isArray(res) ? res : (res.data ?? [])
        return list.map((item) => ({
          id: item.id,
          orderId: item.order_id ?? item.orderId,
          productId: item.product_id ?? item.productId,
          optionId: item.option_id ?? item.optionId,
          productName: item.product_name ?? item.productName ?? '',
          optionName: item.option_name ?? item.optionName ?? '',
          price: item.price ?? 0,
          quantity: item.quantity ?? 1,
          totalPrice: item.total_price ?? item.totalPrice ?? 0,
          status: item.order_state ?? item.orderStatus ?? item.status ?? '',
          failedReason: item.failed_reason ?? null,
          failedAt: item.failed_at ?? null,
        }))
      },
      providesTags: [{ type: 'Order', id: 'HISTORY' }],
    }),

    /** 주문 취소/교환/반품 내역 — GET /orders/{order_id}/cs-history */
    getOrderCsHistory: builder.query({
      query: (orderId) => ({ url: `/orders/${orderId}/cs-history` }),
      transformResponse: (res) => {
        if (!res) return []
        const list = Array.isArray(res) ? res : (res.data ?? [])
        return list.map(normalizeOrder)
      },
      providesTags: (result, error, orderId) => [{ type: 'Order', id: `CS_${orderId}` }],
    }),

    /** 주문 생성 — POST /orders → 201 Created (plain Long orderId, body에 user_id 미포함) */
    createOrder: builder.mutation({
      query: (body) => ({ url: '/orders/get', method: 'POST', body, responseHandler: 'text' }),
      transformResponse: (res) => ({ orderId: res ? Number(res) : null }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data.orderId) dispatch(setLastCreatedOrder(data))
        } catch {}
      },
    }),

    /** 주문 취소 — DELETE /orders/{order_id} (현재 서버 409 반환 중) */
    cancelOrder: builder.mutation({
      query: (orderId) => ({
        url: `/orders/${orderId}`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      invalidatesTags: (result, error, orderId) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),

  }),
})

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useGetOrderHistoryQuery,
  useGetOrderCsHistoryQuery,
  useCreateOrderMutation,
  useCancelOrderMutation,
} = orderApi
