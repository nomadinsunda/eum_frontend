import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

import AddressSearch from '@/features/user/AddressSearch'
import Spinner from '@/shared/components/Spinner'

import { useAppSelector } from '@/hooks/useAppSelector'
import { selectCheckedItemIds } from '@/features/cart/cartSlice'
import useAuth from '@/features/auth/useAuth'

import { useGetCartQuery } from '@/api/cartApi'
import { useGetProductByIdQuery } from '@/api/productApi'
import { useCreateOrderMutation } from '@/api/orderApi'
import { usePreparePaymentMutation } from '@/api/paymentApi'

import useToast from '@/hooks/useToast'

const itemKey = (item) => `${item.productId}-${item.optionId ?? 0}`

// ─── CheckoutItemRow ──────────────────────────────────────────────────────────
function CheckoutItemRow({ item, onReady }) {
  const { data: product } = useGetProductByIdQuery(item.productId)
  const prevRef = useRef(null)

  const selectedOpt = product?.options?.find((o) => String(o.id) === String(item.optionId)) ?? null
  const unitPrice = (product?.price ?? 0) + (selectedOpt?.extra ?? 0)
  const rowTotal = unitPrice * item.quantity

  useEffect(() => {
    if (!product) return
    if (prevRef.current === rowTotal) return
    prevRef.current = rowTotal
    onReady(itemKey(item), rowTotal, product)
  }, [rowTotal, product]) // eslint-disable-line

  if (!product) return null

  return (
    <div className="flex gap-4 items-center py-4 border-b border-[#f5f5f5] last:border-b-0">
      <img
        src={product.img}
        alt={product.name}
        className="w-16 h-16 rounded-xl object-cover border border-[#eee] shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#111] line-clamp-1">{product.name}</p>
        {selectedOpt && (
          <p className="text-[12px] text-[#bbb] mt-0.5">[{selectedOpt.label}]</p>
        )}
        <p className="text-[12px] text-[#bbb]">수량 {item.quantity}개</p>
      </div>
      <p className="font-black text-[16px] text-[#111] shrink-0">{rowTotal.toLocaleString()}원</p>
    </div>
  )
}

const DELIVERY_MESSAGES = [
  '문 앞에 놓아주세요',
  '경비실에 맡겨주세요',
  '배송 전 연락 바랍니다',
  '부재 시 문 앞에 놓아주세요',
  '직접 받겠습니다',
  '직접 입력',
]

// ─── CheckoutPage ─────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const checkedIds = useAppSelector(selectCheckedItemIds)
  const { data: cartData, isLoading: cartLoading } = useGetCartQuery(0)

  const checkedItems = (cartData?.items ?? []).filter((i) => checkedIds.includes(itemKey(i)))

  // ── Price / product map (CheckoutItemRow에서 보고) ──────────────────────────
  const [priceMap, setPriceMap] = useState({})
  const [productMap, setProductMap] = useState({})

  const handleReady = (key, price, product) => {
    setPriceMap((prev) => (prev[key] === price ? prev : { ...prev, [key]: price }))
    setProductMap((prev) => (prev[product.id] ? prev : { ...prev, [product.id]: product }))
  }

  // ── 금액 계산 ───────────────────────────────────────────────────────────────
  const totalProductPrice = checkedItems.reduce(
    (sum, i) => sum + (priceMap[itemKey(i)] ?? 0),
    0,
  )
  const finalAmount = totalProductPrice

  // ── 배송지 폼 ───────────────────────────────────────────────────────────────
  const [isAddrOpen, setIsAddrOpen] = useState(true)

  const [form, setForm] = useState({
    recipientName: '',
    phone: '',
    postcode: '',
    baseAddress: '',
    extraAddress: '',
    detailAddress: '',
    deliveryMsg: '',
    customMsg: '',
  })

  // 사용자 정보 자동 채움
  useEffect(() => {
    if (!user) return
    setForm((prev) => ({
      ...prev,
      recipientName: prev.recipientName || user.name || '',
      phone: prev.phone || user.phoneNumber || '',
    }))
  }, [user?.name, user?.phoneNumber]) // eslint-disable-line

  // ── Toss 결제위젯 ───────────────────────────────────────────────────────────
  const [widgets, setWidgets] = useState(null)
  const [widgetsRendered, setWidgetsRendered] = useState(false)

  // SDK 초기화 (로그인 완료 후 1회)
  useEffect(() => {
    if (!user?.userId) return
    let mounted = true

    loadTossPayments(import.meta.env.VITE_TOSS_CLIENT_KEY)
      .then((tp) => {
        if (!mounted) return
        const w = tp.widgets({ customerKey: String(user.userId) })
        setWidgets(w)
      })
      .catch(() => toast.error('결제위젯 초기화에 실패했습니다.'))

    return () => { mounted = false }
  }, [user?.userId]) // eslint-disable-line

  // 금액 확정 후 위젯 렌더 (1회)
  useEffect(() => {
    if (!widgets || finalAmount <= 0 || widgetsRendered) return

    async function render() {
      try {
        await widgets.setAmount({ currency: 'KRW', value: finalAmount })
        await Promise.all([
          widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
        ])
        setWidgetsRendered(true)
      } catch {
        toast.error('결제수단 로드에 실패했습니다.')
      }
    }

    render()
  }, [widgets, finalAmount, widgetsRendered]) // eslint-disable-line

  // 금액 변경 시 위젯 금액 동기화
  useEffect(() => {
    if (!widgetsRendered || !widgets || finalAmount <= 0) return
    widgets.setAmount({ currency: 'KRW', value: finalAmount }).catch(() => {})
  }, [finalAmount, widgetsRendered]) // eslint-disable-line

  // ── Mutations ───────────────────────────────────────────────────────────────
  const [createOrder] = useCreateOrderMutation()
  const [preparePayment] = usePreparePaymentMutation()
  const [paying, setPaying] = useState(false)

  const getOrderName = () => {
    if (!checkedItems.length) return '주문 상품'
    const first = productMap[checkedItems[0].productId]
    const name = first?.name ?? '주문 상품'
    return checkedItems.length > 1 ? `${name} 외 ${checkedItems.length - 1}건` : name
  }

  const handlePayment = async () => {

    console.log("ok1")

    if (!form.recipientName || !form.postcode || !form.baseAddress) {
      toast.error('배송지를 입력해주세요.')
      return
    }

    console.log("ok2")

    if (!form.phone) {
      toast.error('휴대폰 번호를 입력해주세요.')
      return
    }

    console.log("ok3")
    

    setPaying(true)
    try {
      // 1. 주문 생성
      const orderResult = await createOrder({
        user_name: user.name ?? '',
        receiver_name: form.recipientName,
        receiver_phone: form.phone,
        receiver_addr: [
          form.postcode,
          form.baseAddress,
          form.extraAddress,
          form.detailAddress,
          (form.deliveryMsg === '직접 입력' ? form.customMsg : form.deliveryMsg) || '',
        ].filter(Boolean).join(' '),
        items: checkedItems.map((i) => ({
          productId: i.productId,
          optionId: (productMap[i.productId]?.options?.length ?? 0) > 0 ? i.optionId : 0,
          quantity: i.quantity,
        })),
      }).unwrap()

      const { orderId } = orderResult
      if (!orderId) throw new Error('주문 ID를 확인할 수 없습니다.')
      const orderName = getOrderName()
      const amount = finalAmount

      // 2. 결제 준비 (백엔드 레코드 생성)
      await preparePayment({
        orderId,
        orderName,
        amount,
        customerName: user.name ?? '',
        customerEmail: user.email ?? '',
        currency: 'KRW',
      }).unwrap()

      // 3. 위젯 금액 동기화 후 결제창 오픈
      await widgets.setAmount({ currency: 'KRW', value: amount })
      await widgets.requestPayment({
        orderId: `order-${orderId}`,
        orderName,
        customerName: user.name ?? '',      
        customerEmail: user.email ?? '',
        successUrl: `${import.meta.env.VITE_BASE_URL ?? window.location.origin}/payment/success`,
        failUrl: `${import.meta.env.VITE_BASE_URL ?? window.location.origin}/payment/fail`,
        // customerMobilePhone: (user.phoneNumber ?? '').replace(/-/g, ''),
      })
    } catch (err) {
      // Toss SDK 취소는 에러가 아님
      if (err?.code !== 'USER_CANCEL') {
        toast.error(err?.message ?? '결제 요청 중 오류가 발생했습니다.')
      }
      setPaying(false)
    }
  }

  // ── 렌더 ────────────────────────────────────────────────────────────────────
  if (cartLoading) return <Spinner fullscreen />

  if (!cartLoading && checkedItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-[#555]">
        <p className="text-[16px] font-bold">주문할 상품이 없습니다.</p>
        <button onClick={() => navigate('/cart')} className="btn-primary px-8 py-3 rounded-full">
          장바구니로 이동
        </button>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#FCFBF9] min-h-screen pb-24 text-[#111]">

      <header className="sticky top-0 bg-white border-b border-[#eee] z-50 px-6 py-5">
        <div className="max-w-[1200px] mx-auto grid grid-cols-3 items-center">
          <ChevronLeft
            onClick={() => navigate(-1)}
            className="w-6 h-6 cursor-pointer text-[#111]"
            strokeWidth={2.5}
          />
          <h1 className="text-[18px] font-black text-center text-[#111] tracking-tight">주문/결제</h1>
          <div />
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto mt-10 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── 왼쪽 컬럼 ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 배송지 */}
          <section className="bg-white rounded-[32px] p-8 border border-[#eee]">
            <div
              className="flex items-center justify-between mb-8 cursor-pointer"
              onClick={() => setIsAddrOpen((v) => !v)}
            >
              <div className="w-6" />
              <h2 className="text-[18px] font-black text-[#111] tracking-tight">배송지</h2>
              {isAddrOpen
                ? <ChevronUp className="w-5 h-5 text-[#bbb]" strokeWidth={2.5} />
                : <ChevronDown className="w-5 h-5 text-[#bbb]" strokeWidth={2.5} />}
            </div>

            {isAddrOpen && (
              <div className="grid grid-cols-[100px_1fr] items-center gap-y-5">
                <label className="text-[14px] font-bold text-[#555]">받는사람 <span className="text-[#3ea76e]">*</span></label>
                <input
                  type="text"
                  value={form.recipientName}
                  onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                  className="h-12 bg-white border border-[#eee] rounded-2xl px-5 font-bold text-[14px] outline-none focus:border-[#3ea76e] transition-all"
                  placeholder="이름을 입력하세요"
                />

                <label className="text-[14px] font-bold text-[#555] self-start pt-3">주소 <span className="text-[#3ea76e]">*</span></label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.postcode}
                      readOnly
                      className="flex-[0.4] h-12 bg-[#f9f9f9] border border-[#eee] rounded-2xl px-5 font-bold text-[14px] text-[#bbb]"
                      placeholder="우편번호"
                    />
                    <AddressSearch
                      onSelect={({ postcode, baseAddress, extraAddress }) =>
                        setForm((f) => ({
                          ...f,
                          postcode,
                          baseAddress,
                          extraAddress: extraAddress ?? '',
                        }))
                      }
                    />
                  </div>
                  <input
                    type="text"
                    value={`${form.baseAddress} ${form.extraAddress}`.trim()}
                    readOnly
                    className="w-full h-12 bg-[#f9f9f9] border border-[#eee] rounded-2xl px-5 font-bold text-[14px] text-[#bbb]"
                    placeholder="기본주소"
                  />
                  <input
                    type="text"
                    value={form.detailAddress}
                    onChange={(e) => setForm((f) => ({ ...f, detailAddress: e.target.value }))}
                    className="w-full h-12 bg-white border border-[#eee] rounded-2xl px-5 font-bold text-[14px] outline-none focus:border-[#3ea76e] transition-all"
                    placeholder="나머지 주소"
                  />
                </div>

                <label className="text-[14px] font-bold text-[#555]">휴대폰 <span className="text-[#3ea76e]">*</span></label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="h-12 bg-white border border-[#eee] rounded-2xl px-5 font-bold text-[14px] outline-none focus:border-[#3ea76e] transition-all"
                  placeholder="01012345678"
                />

                <label className="text-[14px] font-bold text-[#555] self-start pt-3">배송 메시지</label>
                <div className="space-y-2">
                  <select
                    value={form.deliveryMsg}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryMsg: e.target.value, customMsg: '' }))}
                    className="w-full h-12 bg-white border border-[#eee] rounded-2xl px-5 font-bold text-[14px] outline-none focus:border-[#3ea76e] transition-all appearance-none cursor-pointer text-[#555]"
                  >
                    <option value="">배송 메시지를 선택하세요</option>
                    {DELIVERY_MESSAGES.map((msg) => (
                      <option key={msg} value={msg}>{msg}</option>
                    ))}
                  </select>
                  {form.deliveryMsg === '직접 입력' && (
                    <input
                      type="text"
                      value={form.customMsg}
                      onChange={(e) => setForm((f) => ({ ...f, customMsg: e.target.value }))}
                      maxLength={100}
                      className="w-full h-12 bg-white border border-[#eee] rounded-2xl px-5 font-bold text-[14px] outline-none focus:border-[#3ea76e] transition-all"
                      placeholder="배송 메시지를 입력하세요 (최대 100자)"
                    />
                  )}
                </div>

              </div>
            )}
          </section>

          {/* 주문상품 */}
          <section className="bg-white rounded-[32px] p-8 border border-[#eee]">
            <h2 className="text-[18px] font-black text-center text-[#111] tracking-tight mb-4">주문상품</h2>
            {checkedItems.map((item) => (
              <CheckoutItemRow key={itemKey(item)} item={item} onReady={handleReady} />
            ))}
          </section>

          {/* 결제수단 — Toss 결제위젯 */}
          <section className="bg-white rounded-[32px] p-8 border border-[#eee]">
            <h2 className="text-[18px] font-black text-center text-[#111] tracking-tight mb-6">결제수단</h2>
            {!widgetsRendered && (
              <div className="flex items-center justify-center h-32">
                <Spinner />
              </div>
            )}
            {/* Toss SDK가 이 div 안에 UI를 렌더링 */}
            <div id="payment-method" />
            <div id="agreement" className="mt-4" />
          </section>

        </div>

        {/* ── 오른쪽: 주문 요약 + 결제 버튼 ─────────────────────────────────── */}
        <div className="lg:block">
          <div className="sticky top-24 space-y-4">

            <section className="bg-white rounded-[32px] p-8 border border-[#eee]">
              <h2 className="text-[16px] font-black text-center mb-6 pb-5 border-b border-[#f5f5f5] tracking-tight">
                주문 예상 금액
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between text-[14px] font-bold text-[#aaa]">
                  <span>총 상품금액</span>
                  <span className="text-[#111]">{totalProductPrice.toLocaleString()}원</span>
                </div>
                <div className="pt-5 border-t border-dashed border-[#eee] flex justify-between items-end">
                  <span className="font-black text-[15px] text-[#111]">최종 결제 금액</span>
                  <span className="text-[28px] font-black leading-none text-[#111] tracking-tighter">
                    {finalAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            </section>

            <button
              onClick={handlePayment}
              disabled={paying || !widgetsRendered || checkedItems.length === 0}
              className="w-full h-16 rounded-full bg-[#3ea76e] text-white font-black text-[17px] border-none cursor-pointer transition-all hover:bg-[#318a57] active:scale-[0.97] disabled:bg-[#eee] disabled:text-[#ccc] disabled:cursor-not-allowed tracking-tight"
            >
              {paying ? '결제 처리중...' : `${finalAmount.toLocaleString()}원 결제하기`}
            </button>

          </div>
        </div>

      </main>
    </div>
  )
}
