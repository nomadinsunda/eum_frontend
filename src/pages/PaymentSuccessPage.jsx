import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useConfirmPaymentMutation, useSubscribePaymentEventsQuery } from '@/api/paymentApi'
import Spinner from '@/shared/components/Spinner'

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [confirmPayment] = useConfirmPaymentMutation()

  const paymentKey = searchParams.get('paymentKey')

  const rawOrderId = searchParams.get('orderId'); // 원본: "order-1486476056744642600"
  const orderId = rawOrderId?.replace('order-', '');

  const amount     = searchParams.get('amount')

  const [status, setStatus]     = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const calledRef = useRef(false)

  

  console.log("orderId={}", orderId);

  // SSE 구독 — orderId 유효 시에만 연결
  const { data: sseData } = useSubscribePaymentEventsQuery(
    orderId,
    { skip: !orderId }
  )

  // SSE payment-status 이벤트 반응 (primary)
  useEffect(() => {
    if (!sseData?.status) return
    if (sseData.status === 'PAID') {
      setStatus((prev) => prev === 'loading' ? 'success' : prev)
    } else if (sseData.status === 'FAILED') {
      setErrorMsg(sseData.failureMessage ?? sseData.message ?? '결제에 실패했습니다.')
      setStatus((prev) => prev === 'loading' ? 'error' : prev)
    }
  }, [sseData])

  // 성공 시 자동 이동 — SSE·confirm 어느 경로든 단일 진입점
  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => navigate(`/order/detail/${orderId}`, { replace: true }), 2000)
    return () => clearTimeout(timer)
  }, [status, navigate, orderId])

  // confirm 호출 — 결제 처리 트리거 + 네트워크/인증 오류 방어
  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    if (!paymentKey || !orderId || !amount) {
      setErrorMsg('결제 정보가 올바르지 않습니다.')
      setStatus('error')
      return
    }

    confirmPayment({
      paymentKey,
      orderId,
      amount: Number(amount),
    })
      .unwrap()
      .then((result) => {
        // SSE 미수신 시 confirm 응답으로 fallback 처리
        if (result?.status === 'APPROVED') {
          setStatus((prev) => prev === 'loading' ? 'success' : prev)
        }
      })
      .catch((err) => {
        setErrorMsg((prev) => prev || (err?.data?.message ?? err?.message ?? '결제 승인 중 오류가 발생했습니다.'))
        setStatus((prev) => prev === 'loading' ? 'error' : prev)
      })
  }, []) // eslint-disable-line

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Spinner />
        <p className="text-[15px] font-bold text-[#555]">결제를 승인하고 있습니다...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <h1 className="text-[22px] font-black text-[#111] tracking-tight">결제 승인 실패</h1>
        <p className="text-[14px] text-[#888] text-center">{errorMsg}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/cart')}
            className="h-12 px-6 rounded-full border border-[#eee] text-[#555] font-bold text-[14px] bg-white hover:bg-[#f9f9f9] transition-all cursor-pointer"
          >
            장바구니로 이동
          </button>
          <button
            onClick={() => navigate('/order/list')}
            className="h-12 px-6 rounded-full bg-[#3ea76e] text-white font-bold text-[14px] border-none hover:bg-[#318a57] transition-all cursor-pointer"
          >
            주문 내역 보기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 rounded-full bg-[#eaf6f0] flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3ea76e" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="text-[22px] font-black text-[#111] tracking-tight">결제가 완료되었습니다</h1>
      <p className="text-[14px] text-[#888]">주문 상세 페이지로 이동합니다...</p>
      <button
        onClick={() => navigate(`/order/detail/${orderId}`, { replace: true })}
        className="h-12 px-8 rounded-full bg-[#3ea76e] text-white font-bold text-[14px] border-none hover:bg-[#318a57] transition-all cursor-pointer"
      >
        주문 상세 보기
      </button>
    </div>
  )
}
