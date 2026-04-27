import { createSlice } from '@reduxjs/toolkit'

/**
 * cartSlice — 장바구니 체크 UI 상태만 관리
 *
 * 서버 GET /cart?page={page} 응답의 isSelected 필드로 페이지 로드 시 동기화 (initCheckedItems).
 * checkedItemIds 원소: `${productId}-${optionId}` 형식의 문자열 키 (optionId=0 sentinel 포함).
 *
 * 체크 토글 시 selectCartItem mutation도 함께 호출하여 서버에 선택 상태 저장.
 */

const initialState = {
  /** 선택된(체크된) 장바구니 아이템 키 목록 — `${productId}-${optionId}` */
  checkedItemIds: [],
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /** 페이지 로드 시 서버 isSelected 기준으로 체크 상태 초기화 */
    initCheckedItems(state, action) {
      state.checkedItemIds = action.payload
    },
    toggleCheckItem(state, action) {
      const id = action.payload
      if (state.checkedItemIds.includes(id)) {
        state.checkedItemIds = state.checkedItemIds.filter((i) => i !== id)
      } else {
        state.checkedItemIds.push(id)
      }
    },
    /** 더보기 로드 시 새 페이지의 isSelected 항목을 기존 체크 목록에 병합 */
    mergeCheckedItems(state, action) {
      state.checkedItemIds = [...new Set([...state.checkedItemIds, ...action.payload])]
    },
    checkAllItems(state, action) {
      state.checkedItemIds = action.payload
    },
    uncheckAllItems(state) {
      state.checkedItemIds = []
    },
  },
})

export const {
  initCheckedItems,
  mergeCheckedItems,
  toggleCheckItem,
  checkAllItems,
  uncheckAllItems,
} = cartSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectCheckedItemIds = (state) => state.cart.checkedItemIds

export default cartSlice.reducer
