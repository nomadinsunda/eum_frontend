import { apiSlice } from './apiSlice'

export const productApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    /** 상품 상세 — Product Server: GET /api/v1/product/{productId} */
    getProductById: builder.query({
      query: (id) => ({ url: `/product/${id}` }),
      transformResponse: (res) => {
        const p = res.data ?? res
        const imageUrls = p.imageUrls ?? (p.imageUrl ? [p.imageUrl] : [])
        return {
          id:            p.productId ?? p.id,
          name:          p.productName ?? p.title ?? p.name,
          brand:         p.brandName  ?? p.brand,
          brandId:       p.brandId    ?? null,
          categoryId:    p.categoryId ?? null,
          category:      p.categoryName ?? p.category,
          desc:          p.content ?? p.description ?? p.desc,
          price:         p.price,
          status:        p.status ?? null,
          tags:          p.tags   ?? null,
          salesCount:    p.salesCount    ?? 0,
          stockQuantity: p.stockQuantity ?? 0,
          stockStatus:   p.stockStatus   ?? 'AVAILABLE',
          img:           imageUrls[0] ?? null,
          images:        imageUrls,
          // detailImageUrls — 상세 이미지 URL 배열
          // 서버가 string / flat array / 중첩 array / JSON 문자열 중 어느 형태로 줘도 처리
          detailImgs: (() => {
            const raw = p.detailImageUrls ?? p.detailImagelUrl  // 정식 필드 우선, 이전 오타명 fallback
            if (!raw) return p.detailImages ?? p.detailImgs ?? []
            if (typeof raw === 'string') {
              try {
                const parsed = JSON.parse(raw)
                return Array.isArray(parsed)
                  ? parsed.flat(Infinity).filter(s => typeof s === 'string' && s)
                  : [raw]
              } catch {
                return [raw]
              }
            }
            if (Array.isArray(raw)) {
              return raw.flat(Infinity).filter(s => typeof s === 'string' && s)
            }
            return []
          })(),
          options: (p.options ?? []).map((opt) => ({
            id:            opt.optionId    ?? null,
            label:         opt.optionName  ?? opt.label,
            extra:         opt.extraPrice  ?? opt.additionalPrice ?? opt.extra ?? 0,
            stockQuantity: opt.stockQuantity ?? 0,
            stockStatus:   opt.stockStatus   ?? 'AVAILABLE',
          })),
          relatedProducts: (p.relatedProducts ?? []).map((rp) => ({
            id:           rp.productId    ?? rp.id,
            name:         rp.productName  ?? rp.title ?? rp.name,
            originalPrice: rp.originalPrice ?? rp.price,
            discountPrice: rp.discountPrice ?? null,
            img:          (rp.imageUrls?.[0]) ?? rp.imageUrl ?? rp.img,
            options:      rp.options ?? [],
          })),
        }
      },
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),

    /** 상품 옵션 목록 — Product Server: GET /api/v1/product/{productId}/options */
    getProductOptions: builder.query({
      query: (id) => ({ url: `/product/${id}/options` }),
      transformResponse: (res) => (res ?? []).map((opt) => ({
        id:            opt.optionId,
        label:         opt.optionName,
        extra:         opt.extraPrice  ?? 0,
        stockQuantity: opt.stockQuantity ?? 0,
        stockStatus:   opt.stockStatus   ?? 'AVAILABLE',
      })),
      providesTags: (result, error, id) => [{ type: 'Product', id: `options-${id}` }],
    }),

    /** 카테고리 트리 — Product Server: GET /api/v1/product/categories */
    getProductCategories: builder.query({
      query: () => ({ url: '/product/categories' }),
      transformResponse: (res) => (res ?? []).map((cat) => ({
        id:           cat.categoryId,
        name:         cat.name,
        displayOrder: cat.displayOrder ?? 0,
        children: (cat.children ?? []).map((child) => ({
          id:           child.categoryId,
          name:         child.name,
          displayOrder: child.displayOrder ?? 0,
          children:     child.children ?? [],
        })),
      })),
      providesTags: [{ type: 'Category', id: 'PRODUCT_TREE' }],
    }),

    /** 상품 요약 — Product Server: GET /api/v1/product/frontend/{productId} */
    getProductSummary: builder.query({
      query: (id) => ({ url: `/product/frontend/${id}` }),
      transformResponse: (res) => ({
        id:      res.productId,
        name:    res.productName,
        img:     res.imageUrl ?? null,
        price:   res.price    ?? 0,
        options: (res.options ?? []).map((opt) => ({
          id:    opt.optionId,
          label: opt.optionName,
        })),
      }),
      providesTags: (result, error, id) => [{ type: 'Product', id: `summary-${id}` }],
    }),

  }),
})

export const {
  useGetProductByIdQuery,
  useGetProductOptionsQuery,
  useGetProductCategoriesQuery,
  useGetProductSummaryQuery,
} = productApi
