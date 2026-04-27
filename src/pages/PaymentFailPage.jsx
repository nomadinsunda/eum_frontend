import { useSearchParams, useNavigate } from 'react-router-dom'

export default function PaymentFailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const code    = searchParams.get('code') ?? '알 수 없음'
  const message = searchParams.get('message') ?? '결제에 실패했습니다.'
  const orderId = searchParams.get('orderId')

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </div>
      <h1 className="text-[22px] font-black text-[#111] tracking-tight">결제에 실패했습니다</h1>
      <div className="bg-[#f9f9f9] border border-[#eee] rounded-2xl px-6 py-4 text-[13px] text-[#666] space-y-2 w-full max-w-sm">
        {orderId && (
          <p><span className="font-bold text-[#333]">주문 번호:</span> {orderId}</p>
        )}
        <p><span className="font-bold text-[#333]">오류 코드:</span> {code}</p>
        <p><span className="font-bold text-[#333]">오류 메시지:</span> {decodeURIComponent(message)}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/cart')}
          className="h-12 px-6 rounded-full border border-[#eee] text-[#555] font-bold text-[14px] bg-white hover:bg-[#f9f9f9] transition-all cursor-pointer"
        >
          장바구니로 돌아가기
        </button>
        <button
          onClick={() => navigate('/checkout')}
          className="h-12 px-6 rounded-full bg-[#3ea76e] text-white font-bold text-[14px] border-none hover:bg-[#318a57] transition-all cursor-pointer"
        >
          다시 결제하기
        </button>
      </div>
    </div>
  )
}
