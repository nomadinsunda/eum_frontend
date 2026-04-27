import { apiSlice } from './apiSlice'

export const cartApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // GET /cart?page={page}  — 더보기 방식
    getCart: builder.query({
      query: (page = 0) => ({ url: '/cart/get', params: { page } }),
      transformResponse: (res) => {
        const d = res.data ?? res
        return {
          userId:            d.userId,
          selectedItemCount: d.selectedItemCount ?? 0,
          allSelected:       d.allSelected       ?? false,
          hasSelectedItems:  d.hasSelectedItems  ?? false,
          page:              d.page              ?? 0,
          size:              d.size              ?? 10,
          hasNext:           d.hasNext           ?? false,
          items: (d.items ?? []).map((item) => ({
            productId:  item.productId,
            optionId:   item.optionId   ?? 0,
            quantity:   item.quantity   ?? 1,
            isSelected: item.isSelected ?? false,
            isSoldOut:  item.isSoldOut  ?? false,
          })),
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ productId, optionId }) => ({
                type: 'Cart',
                id: `${productId}-${optionId}`,
              })),
              { type: 'Cart', id: 'LIST' },
            ]
          : [{ type: 'Cart', id: 'LIST' }],
    }),

    // POST /cart/additem
    addCartItem: builder.mutation({
      query: (body) => ({ url: '/cart/additem', method: 'POST', body }),
      invalidatesTags: [{ type: 'Cart', id: 'LIST' }],
    }),

    // PUT /cart/quantity  (quantity=0 이면 삭제)
    updateCartItemQuantity: builder.mutation({
      query: (body) => ({ url: '/cart/quantity', method: 'PUT', body }),
      invalidatesTags: [{ type: 'Cart', id: 'LIST' }],
    }),

    // PUT /cart/option
    updateCartItemOption: builder.mutation({
      query: (body) => ({ url: '/cart/option', method: 'PUT', body }),
      invalidatesTags: [{ type: 'Cart', id: 'LIST' }],
    }),

    // DELETE /cart/selected  (단건)
    removeCartItem: builder.mutation({
      query: (body) => ({ url: '/cart/selected', method: 'DELETE', body }),
      invalidatesTags: [{ type: 'Cart', id: 'LIST' }],
    }),

    // DELETE /cart/selecteditems  (복수 삭제)
    removeSelectedCartItems: builder.mutation({
      query: (body) => ({ url: '/cart/selecteditems', method: 'DELETE', body }),
      invalidatesTags: [{ type: 'Cart', id: 'LIST' }],
    }),

    // PUT /cart/select
    selectCartItem: builder.mutation({
      query: (body) => ({ url: '/cart/select', method: 'PUT', body }),
      invalidatesTags: [{ type: 'Cart', id: 'LIST' }],
    }),

    // PUT /cart/select-all
    selectAllCartItems: builder.mutation({
      query: (body) => ({ url: '/cart/select-all', method: 'PUT', body }),
      invalidatesTags: [{ type: 'Cart', id: 'LIST' }],
    }),

  }),
})

export const {
  useGetCartQuery,
  useAddCartItemMutation,
  useUpdateCartItemQuantityMutation,
  useUpdateCartItemOptionMutation,
  useRemoveCartItemMutation,
  useRemoveSelectedCartItemsMutation,
  useSelectCartItemMutation,
  useSelectAllCartItemsMutation,
} = cartApi
