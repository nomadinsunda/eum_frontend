import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useGetNoticeDetailQuery } from '@/api/noticeApi'
import Spinner from '@/shared/components/Spinner'

export default function NoticeDetailPage() {
  const { id } = useParams()
  const { data: notice, isLoading, isError } = useGetNoticeDetailQuery(id)

  if (isLoading) return <Spinner />

  if (isError || !notice) {
    return (
      <div className="w-full bg-[#FCFBF9] min-h-screen">
        <div className="max-w-[860px] mx-auto px-4 pt-16 text-center">
          <p className="text-[#999] text-[15px] py-20">공지사항을 불러올 수 없습니다.</p>
          <Link to="/notice" className="btn-outline px-6 py-2.5 text-[14px] rounded-lg">
            목록으로
          </Link>
        </div>
      </div>
    )
  }

  const hasImages = notice.images?.length > 0

  return (
    <div className="w-full bg-[#FCFBF9] min-h-screen pb-28">
      <div className="max-w-[860px] mx-auto px-4 pt-16">

        {/* 뒤로가기 */}
        <Link
          to="/notice"
          className="inline-flex items-center gap-1 text-[13px] text-[#999] hover:text-primary transition-colors mb-8"
        >
          <ChevronLeft size={15} />
          목록으로
        </Link>

        {/* 헤더 */}
        <div className="border-t border-[#111] pt-6 pb-5 border-b border-b-[#eee]">
          {notice.isPinned && (
            <span className="inline-block text-[11px] font-bold text-primary border border-primary rounded px-2 py-0.5 mb-3">
              공지
            </span>
          )}
          <h1 className="text-[18px] font-bold text-[#111] leading-snug mb-3">
            {notice.title}
          </h1>
          {notice.createdAt && (
            <p className="text-[13px] text-[#bbb]">{notice.createdAt}</p>
          )}
        </div>

        {/* 본문 */}
        <div className="py-10">
          {/* 이미지 */}
          {hasImages && (
            <div className="flex flex-col gap-3 mb-8">
              {notice.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`공지 이미지 ${i + 1}`}
                  className="w-full h-auto rounded-lg"
                />
              ))}
            </div>
          )}

          {/* 텍스트 */}
          {notice.content && (
            <p className="whitespace-pre-wrap text-[14px] leading-[1.9] text-[#444]">
              {notice.content}
            </p>
          )}
        </div>

        {/* 하단 */}
        <div className="border-t border-[#eee] pt-8 flex justify-center">
          <Link to="/notice" className="btn-outline px-8 py-3 text-[14px] rounded-lg">
            목록으로
          </Link>
        </div>
      </div>
    </div>
  )
}
