import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DayPicker } from 'react-day-picker'
import { ko } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { useGetOrdersQuery } from '../api/orderApi'
import Pagination from '../shared/components/Pagination'
import Spinner from '../shared/components/Spinner'

const STATUS_OPTIONS = ['전체 주문처리상태', '입금전', '배송준비중', '배송중', '배송완료', '취소', '교환', '반품']
const PERIOD_OPTIONS = ['오늘', '1개월', '3개월', '6개월', '기간설정']
const PAGE_SIZE = 3

const STATUS_API_MAP = {
  '입금전': 'PENDING',
  '배송준비중': 'PREPARING',
  '배송중': 'SHIPPING',
  '배송완료': 'DELIVERED',
  '취소': 'CANCELLED',
  '교환': 'EXCHANGED',
  '반품': 'REFUNDED',
}

const PERIOD_API_MAP = {
  '오늘': '1d',
  '1개월': '1m',
  '3개월': '3m',
  '6개월': '6m',
}

const STATUS_DISPLAY_MAP = {
  ORDER_CHECKED_OUT:            '주문접수',
  INVENTORY_RESERVED:           '결제대기',
  INVENTORY_RESERVATION_FAILED: '재고부족',
  PAYMENT_COMPLETED:            '결제완료',
  PAYMENT_FAILED:               '결제실패',
  INVENTORY_DEDUCTION_FAILED:   '처리오류',
  INVENTORY_RELEASED:           '주문취소',
  INVENTORY_RELEASE_FAILED:     '취소오류',
  ORDER_COMPLETED:              '주문완료',
  ORDER_CANCELLED:              '주문취소',
}

const STATUS_COLOR_MAP = {
  ORDER_COMPLETED:              'text-[#3ea76e]',
  PAYMENT_COMPLETED:            'text-[#3ea76e]',
  INVENTORY_RESERVED:           'text-[#3ea76e]',
  ORDER_CANCELLED:              'text-[#ef4444]',
  PAYMENT_FAILED:               'text-[#ef4444]',
  INVENTORY_RESERVATION_FAILED: 'text-[#ef4444]',
  INVENTORY_DEDUCTION_FAILED:   'text-[#ef4444]',
  INVENTORY_RELEASE_FAILED:     'text-[#ef4444]',
  ORDER_CHECKED_OUT:            'text-[#f59e0b]',
  INVENTORY_RELEASED:           'text-[#888]',
}

export default function OrderPage() {
  const [activeMainTab, setActiveMainTab] = useState('주문내역')
  const [status, setStatus] = useState('전체 주문처리상태')
  const [period, setPeriod] = useState('3개월')
  const [range, setRange] = useState({ from: undefined, to: undefined })
  const [page, setPage] = useState(1)

  const apiStatus = status === '전체 주문처리상태' ? undefined : STATUS_API_MAP[status]
  const isCustomPeriod = period === '기간설정'

  const toYMD = (date) => date ? date.toISOString().slice(0, 10) : undefined

  const dateParams = isCustomPeriod
    ? { start_date: toYMD(range.from), end_date: toYMD(range.to) }
    : { period: PERIOD_API_MAP[period] }

  const { data, isLoading } = useGetOrdersQuery({
    status: apiStatus,
    ...dateParams,
    page,
    size: PAGE_SIZE,
  })

  const orders = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0

  useEffect(() => {
    if (page > Math.max(totalPages, 1)) {
      setPage(Math.max(totalPages, 1))
    }
  }, [page, totalPages])

  const handleFilterChange = (setter, val) => {
    setter(val)
    setPage(1)
    if (setter === setPeriod && val !== '기간설정') {
      setRange({ from: undefined, to: undefined })
    }
  }

  const handleRangeChange = (newRange) => {
    setRange(newRange ?? { from: undefined, to: undefined })
    setPage(1)
  }

  return (
    <div className="w-full bg-[#FCFBF9] min-h-screen pb-28 px-4">

      <div className="max-w-[1200px] mx-auto text-center py-24">
        <h1 className="text-[36px] font-black tracking-[-0.05em] text-[#111]">주문조회</h1>
      </div>

      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-center gap-16 md:gap-24 mb-16 border-b border-[#eee]">
          {[
            { key: '주문내역', label: `주문내역 조회 (${totalElements}건)` },
            { key: '취소교환반품', label: '취소/교환/반품 내역' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveMainTab(tab.key)}
              className={`pb-6 text-[16px] font-black border-none bg-transparent cursor-pointer transition-all tracking-tight relative ${
                activeMainTab === tab.key ? 'text-[#3ea76e]' : 'text-[#bbb] hover:text-[#999]'
              }`}
            >
              {tab.label}
              {activeMainTab === tab.key && (
                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#3ea76e] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="bg-white border border-[#eee] p-10 md:p-14 mb-16 rounded-[40px] shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-8">
            <span className="text-[15px] font-extrabold text-[#111] w-20 shrink-0">주문상태</span>
            <select
              value={status}
              onChange={e => handleFilterChange(setStatus, e.target.value)}
              className="w-full max-w-[450px] h-14 border border-[#eee] bg-[#f9f9f9] px-6 outline-none text-[#333] rounded-full text-[15px] focus:border-[#3ea76e] focus:bg-white transition-all font-bold cursor-pointer"
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-10">
            <span className="text-[15px] font-extrabold text-[#111] w-20 shrink-0">조회기간</span>
            <div className="flex w-full max-w-[650px] gap-3">
              {PERIOD_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => handleFilterChange(setPeriod, p)}
                  className={`flex-1 h-12 text-[14px] font-bold cursor-pointer transition-all tracking-tight rounded-full border ${
                    period === p
                      ? 'bg-[#3ea76e] text-white border-[#3ea76e] shadow-md shadow-green-100'
                      : 'bg-white text-[#aaa] border-[#eee] hover:border-[#3ea76e] hover:text-[#3ea76e]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {isCustomPeriod && (
            <div className="flex flex-col items-start gap-4 mb-10">
              <div className="flex items-center gap-3 text-[14px] font-bold text-[#888]">
                <span>{range.from ? range.from.toLocaleDateString('ko-KR') : '시작일'}</span>
                <span>~</span>
                <span>{range.to ? range.to.toLocaleDateString('ko-KR') : '종료일'}</span>
              </div>
              <DayPicker
                locale={ko}
                mode="range"
                selected={range}
                onSelect={handleRangeChange}
                captionLayout="dropdown"
                toDate={new Date()}
              />
            </div>
          )}

        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <div className="space-y-10">
            {orders.length === 0 && (
              <div className="text-center py-24 text-[#bbb] font-bold text-[16px]">해당 조건의 주문 내역이 없습니다.</div>
            )}
            {orders.map(order => (
              <div key={order.id} className="bg-white border border-[#eee] rounded-[40px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.04)] transition-all">
                <div className="flex items-center justify-between px-10 py-8 bg-[#fcfcfc] border-b border-[#f5f5f5]">
                  <div className="flex items-center gap-8">
                    <span className="text-[20px] font-black text-[#111] tracking-tighter">{order.date}</span>
                    <span className="text-[13px] font-bold text-[#ccc] tracking-widest">{order.id}</span>
                  </div>
                  <Link to={`/order/detail/${order.id}`} className="text-[14px] font-bold text-[#aaa] hover:text-[#3ea76e] transition-colors">상세보기 &gt;</Link>
                </div>

                <div className="px-10 md:px-14 py-10 flex items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className={`text-[16px] font-black ${STATUS_COLOR_MAP[order.status] ?? 'text-[#f59e0b]'}`}>
                      {STATUS_DISPLAY_MAP[order.status] ?? order.status}
                    </span>
                    <p className="text-[14px] font-bold text-[#bbb]">
                      받는 분 · {order.address.recipient || order.ordererName}
                    </p>
                  </div>
                </div>

                <div className="px-10 md:px-14 py-8 bg-[#fcfcfc] border-t border-[#f5f5f5] flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-[13px] font-bold text-[#bbb] tracking-tight">
                    상품금액 {order.productPrice?.toLocaleString()} - 할인 {order.discountPrice?.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-5">
                    <span className="text-[15px] font-bold text-[#888]">최종 결제금액</span>
                    <span className="text-[28px] font-black text-[#111] tracking-tighter">{order.total?.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo(0, 0) }} />
      </div>
    </div>
  )
}
