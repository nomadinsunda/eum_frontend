import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  lastCreatedOrder: null,
  pagination: {
    page: 1,
    size: 10,
  },
}

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setLastCreatedOrder(state, action) {
      state.lastCreatedOrder = action.payload
    },
    clearLastCreatedOrder(state) {
      state.lastCreatedOrder = null
    },
    setOrderPage(state, action) {
      state.pagination.page = action.payload
    },
  },
})

export const {
  setLastCreatedOrder,
  clearLastCreatedOrder,
  setOrderPage,
} = orderSlice.actions

export const selectLastCreatedOrder = (state) => state.order.lastCreatedOrder
export const selectOrderPagination  = (state) => state.order.pagination

export default orderSlice.reducer
