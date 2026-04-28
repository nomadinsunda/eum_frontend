import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight, Headphones, MessageSquare, Info,
  Bot, Send, FileText,
  Search, Upload, RotateCcw,
  CheckCircle, AlertCircle, Loader2,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  useRagChatMutation,
  useGetSessionHistoryQuery,
  useHybridSearchMutation,
  useUploadDocumentMutation,
  useGetDocumentStatusQuery,
  useGetDocumentChunksQuery,
} from '@/api/ragApi'

const ERROR_MESSAGES = {
  'AI-429': 'AI 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'LLM-502': 'AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  'EMB-502': '질문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}
const DEFAULT_ERROR = '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'

const STATUS_LABEL = {
  pending: '대기 중', parsing: '파싱 중', parsed: '파싱 완료',
  embedding: '임베딩 중', embedded: '임베딩 완료', indexing: '색인 중',
  processed: '처리 완료', failed: '실패',
}
const DONE_STATUSES = ['processed', 'failed']

const CSPage = () => {
  // ── 채팅 ────────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [input, setInput] = useState('')
  const [showRestore, setShowRestore] = useState(false)
  const [restoreInput, setRestoreInput] = useState('')
  const [restoreQueryId, setRestoreQueryId] = useState(null)
  const bottomRef = useRef(null)

  // ── 검색 ────────────────────────────────────────────────────────────────────
  const [searchQuestion, setSearchQuestion] = useState('')
  const [searchTopK, setSearchTopK] = useState('')

  // ── 문서 ────────────────────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null)
  const [docId, setDocId] = useState('')
  const [docCategory, setDocCategory] = useState('')
  const [trackedDocId, setTrackedDocId] = useState(null)
  const [shouldPoll, setShouldPoll] = useState(false)
  const [showChunks, setShowChunks] = useState(false)

  // ── RTK Query 훅 ─────────────────────────────────────────────────────────────
  const [ragChat, { isLoading: isChatLoading }] = useRagChatMutation()
  const { data: historyData } = useGetSessionHistoryQuery(restoreQueryId, { skip: !restoreQueryId })

  const [hybridSearch, { isLoading: isSearching, data: searchData, isError: isSearchError }] = useHybridSearchMutation()

  const [uploadDocument, { isLoading: isUploading, isError: isUploadError }] = useUploadDocumentMutation()
  const { data: docStatus } = useGetDocumentStatusQuery(trackedDocId, {
    skip: !trackedDocId,
    pollingInterval: shouldPoll ? 2000 : 0,
  })
  const { data: chunkData, isLoading: isChunksLoading } = useGetDocumentChunksQuery(trackedDocId, {
    skip: !trackedDocId || !showChunks,
  })

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isChatLoading])

  useEffect(() => {
    if (!docStatus) return
    if (DONE_STATUSES.includes(docStatus.status?.toLowerCase())) setShouldPoll(false)
  }, [docStatus])

  useEffect(() => {
    if (!historyData) return
    setSessionId(historyData.sessionId)
    setMessages(
      (historyData.messages ?? []).map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        text: m.content,
      }))
    )
    setRestoreQueryId(null)
    setRestoreInput('')
    setShowRestore(false)
  }, [historyData])

  // ── 채팅 핸들러 ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const question = input.trim()
    if (!question || isChatLoading) return
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    try {
      const { sessionId: newSessionId, answer, sources } = await ragChat({ sessionId, question }).unwrap()
      setSessionId(newSessionId)
      setMessages((prev) => [...prev, { role: 'assistant', text: answer, sources: sources ?? [] }])
    } catch (err) {
      const code = err?.data?.code
      setMessages((prev) => [...prev, { role: 'assistant', text: ERROR_MESSAGES[code] ?? DEFAULT_ERROR }])
    }
  }

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleRestore = () => {
    const id = restoreInput.trim()
    if (!id) return
    setRestoreQueryId(id)
  }

  const handleResetChat = () => {
    setMessages([])
    setSessionId(null)
    setInput('')
  }

  // ── 검색 핸들러 ───────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuestion.trim() || isSearching) return
    try {
      await hybridSearch({
        question: searchQuestion.trim(),
        ...(searchTopK ? { topK: Number(searchTopK) } : {}),
      })
    } catch { /* RTK error state로 처리 */ }
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch() }
  }

  // ── 문서 핸들러 ───────────────────────────────────────────────────────────────
  const handleFileChange = (e) => setUploadFile(e.target.files[0] || null)

  const handleUpload = async () => {
    if (!uploadFile || isUploading) return
    try {
      const result = await uploadDocument({
        file: uploadFile,
        ...(docId.trim() ? { documentId: docId.trim() } : {}),
        ...(docCategory ? { category: docCategory } : {}),
      }).unwrap()
      setTrackedDocId(result.documentId)
      setShouldPoll(true)
      setShowChunks(false)
      setUploadFile(null)
      setDocId('')
      setDocCategory('')
    } catch { /* RTK error state로 처리 */ }
  }

  const statusKey = docStatus?.status?.toLowerCase()
  const isProcessing = trackedDocId && !DONE_STATUSES.includes(statusKey ?? '')

  // ── 렌더 ──────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-[#FCFBF9] text-[#111] pb-28 px-4 min-h-screen">
      <div className="max-w-[1200px] mx-auto text-center py-24">
        <h1 className="text-[36px] font-black tracking-[-0.05em] text-[#111]">고객센터</h1>
      </div>

      <div className="max-w-[860px] mx-auto">

        {/* ===== 전화 상담 ===== */}
        <div className="bg-white rounded-[40px] border border-[#eee] p-10 md:p-14 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)] transition-all mb-8">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-8 justify-center md:justify-start">
              <Headphones size={18} className="text-[#3ea76e]" strokeWidth={2.5} />
              <h2 className="text-[#3ea76e] text-[13px] font-black uppercase tracking-widest">고객센터</h2>
            </div>
            <div className="text-[40px] md:text-[52px] font-black mb-8 tracking-[-0.06em] leading-none text-center md:text-left text-[#111]">
              032-212-2202
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 justify-center md:justify-start text-[#888] text-[15px] font-bold tracking-tight">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#3ea76e] rounded-full"></span>
                평일 10:00 — 18:00
              </span>
              <span className="hidden md:block text-[#eee]">|</span>
              <span className="text-[#bbb]">점심 13:00 — 14:00</span>
            </div>
          </div>
        </div>

        {/* ===== AI 채팅 상담 ===== */}
        <div className="bg-white rounded-[40px] border border-[#eee] shadow-[0_10px_40px_rgba(0,0,0,0.03)] mb-8 overflow-hidden">
          {/* 헤더 */}
          <div className="p-8 md:p-10 border-b border-[#eee] flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bot size={18} className="text-[#3ea76e]" strokeWidth={2.5} />
                <h2 className="text-[#3ea76e] text-[13px] font-black uppercase tracking-widest">AI 상담</h2>
              </div>
              <p className="text-[15px] font-bold text-[#888] tracking-tight">스위피 AI가 궁금하신 점을 도와드립니다.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowRestore((v) => !v)}
                className={`text-[12px] font-black px-3 py-1.5 rounded-xl transition-colors ${
                  showRestore ? 'bg-[#f0faf4] text-[#3ea76e]' : 'text-[#888] hover:bg-[#f9f9f9]'
                }`}
              >
                대화 복원
              </button>
              <button
                onClick={handleResetChat}
                className="p-2 rounded-xl hover:bg-[#f9f9f9] transition-colors"
                title="대화 초기화"
              >
                <RotateCcw size={15} className="text-[#bbb]" />
              </button>
            </div>
          </div>

          {/* 세션 복원 패널 */}
          {showRestore && (
            <div className="px-8 py-4 border-b border-[#eee] bg-[#fafafa]">
              {sessionId && (
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-[#bbb]">현재 세션</span>
                  <span className="text-[11px] font-black text-[#888] bg-[#f0faf4] px-2 py-0.5 rounded-lg break-all">{sessionId}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={restoreInput}
                  onChange={(e) => setRestoreInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRestore()}
                  placeholder="복원할 세션 ID를 입력하세요..."
                  className="flex-1 px-4 py-2.5 bg-white border border-[#eee] rounded-[16px] text-[13px] font-bold text-[#111] placeholder:text-[#ccc] focus:outline-none focus:ring-2 focus:ring-[#3ea76e]"
                />
                <button
                  onClick={handleRestore}
                  disabled={!restoreInput.trim()}
                  className="px-4 py-2.5 bg-[#3ea76e] text-white text-[13px] font-black rounded-[16px] disabled:opacity-40 hover:bg-[#35966a] transition-colors whitespace-nowrap"
                >
                  복원
                </button>
              </div>
            </div>
          )}

          {/* 메시지 영역 */}
          <div className="h-[420px] overflow-y-auto p-6 flex flex-col gap-4">
            {messages.length === 0 && !isChatLoading && (
              <div className="flex-1 flex items-center justify-center h-full">
                <p className="text-[13px] font-bold text-[#ccc] tracking-tight">질문을 입력해 주세요.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] px-5 py-3 rounded-[20px] text-[14px] font-bold leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#3ea76e] text-white rounded-br-sm'
                    : 'bg-[#f9f9f9] text-[#333] rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
                {msg.sources?.length > 0 && (
                  <div className="max-w-[80%] flex flex-col gap-1.5">
                    {msg.sources.map((src, si) => (
                      <div key={si} className="flex items-start gap-2 px-3 py-2 bg-[#f0faf4] rounded-2xl border border-[#d4eddf]">
                        <FileText size={12} className="text-[#3ea76e] mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[11px] font-black text-[#3ea76e] block mb-0.5">{src.filename}</span>
                          <span className="text-[11px] font-bold text-[#888] leading-relaxed">{src.snippet}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-start">
                <div className="px-5 py-3 bg-[#f9f9f9] rounded-[20px] rounded-bl-sm">
                  <span className="text-[14px] font-bold text-[#bbb]">답변 생성 중...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-4 md:p-6 border-t border-[#eee] flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              disabled={isChatLoading}
              placeholder="질문을 입력하세요..."
              className="flex-1 px-5 py-3.5 bg-[#f9f9f9] rounded-[20px] text-[14px] font-bold text-[#111] placeholder:text-[#ccc] focus:outline-none focus:ring-2 focus:ring-[#3ea76e] disabled:opacity-50 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isChatLoading || !input.trim()}
              className="w-12 h-12 rounded-full bg-[#3ea76e] flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#35966a] active:bg-[#2d8560] transition-colors shrink-0"
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ===== AI 검색 ===== */}
        <div className="mt-8">
          <div className="flex items-center gap-6 mb-6">
            <h2 className="text-[20px] font-black text-[#111] tracking-tight shrink-0">AI 검색</h2>
            <div className="h-[1px] w-full bg-[#eee]"></div>
          </div>

          <div className="bg-white rounded-[40px] border border-[#eee] shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="p-8 md:p-10 border-b border-[#eee]">
              <div className="flex items-center gap-2 mb-3">
                <Search size={18} className="text-[#3ea76e]" strokeWidth={2.5} />
                <h3 className="text-[#3ea76e] text-[13px] font-black uppercase tracking-widest">하이브리드 검색</h3>
              </div>
              <p className="text-[15px] font-bold text-[#888] tracking-tight">BM25 + 벡터 검색으로 관련 문서를 찾습니다.</p>
            </div>

            <div className="p-6 md:p-8 border-b border-[#eee]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuestion}
                  onChange={(e) => setSearchQuestion(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="검색어를 입력하세요..."
                  className="flex-1 px-5 py-3.5 bg-[#f9f9f9] rounded-[20px] text-[14px] font-bold text-[#111] placeholder:text-[#ccc] focus:outline-none focus:ring-2 focus:ring-[#3ea76e]"
                />
                <input
                  type="number"
                  value={searchTopK}
                  onChange={(e) => setSearchTopK(e.target.value)}
                  placeholder="TopK"
                  min="1"
                  className="w-24 px-4 py-3.5 bg-[#f9f9f9] rounded-[20px] text-[14px] font-bold text-[#111] placeholder:text-[#ccc] focus:outline-none focus:ring-2 focus:ring-[#3ea76e] text-center"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuestion.trim()}
                  className="w-12 h-12 rounded-full bg-[#3ea76e] flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#35966a] transition-colors shrink-0"
                >
                  {isSearching
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Search size={16} strokeWidth={2.5} />
                  }
                </button>
              </div>
              {isSearchError && (
                <p className="mt-3 text-[13px] font-bold text-red-500">검색 중 오류가 발생했습니다.</p>
              )}
            </div>

            {searchData && (
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[13px] font-black text-[#111]">검색 결과</span>
                  <span className="text-[12px] font-bold text-[#888]">{searchData.results?.length ?? 0}건 / TopK {searchData.topK}</span>
                </div>
                {searchData.results?.length === 0 ? (
                  <p className="text-[13px] font-bold text-[#ccc]">검색 결과가 없습니다.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {searchData.results?.map((r, i) => (
                      <div key={i} className="p-4 bg-[#f9f9f9] rounded-2xl">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <FileText size={13} className="text-[#3ea76e] shrink-0" />
                          <span className="text-[13px] font-black text-[#111] flex-1">{r.filename}</span>
                          <span className="text-[11px] font-black text-[#3ea76e] bg-[#f0faf4] px-2 py-0.5 rounded-lg">{r.category}</span>
                          <span className="text-[11px] font-bold text-[#bbb]">#{r.chunkIndex}</span>
                          <span className="text-[11px] font-black text-[#888]">{r.score.toFixed(4)}</span>
                        </div>
                        <p className="text-[12px] font-bold text-[#888] leading-relaxed line-clamp-3 pl-[21px]">{r.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== 문서 관리 ===== */}
        <div className="mt-8">
          <div className="flex items-center gap-6 mb-6">
            <h2 className="text-[20px] font-black text-[#111] tracking-tight shrink-0">문서 관리</h2>
            <div className="h-[1px] w-full bg-[#eee]"></div>
          </div>

          <div className="bg-white rounded-[40px] border border-[#eee] shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden">
            {/* 업로드 폼 */}
            <div className="p-8 md:p-10 border-b border-[#eee]">
              <div className="flex items-center gap-2 mb-6">
                <Upload size={18} className="text-[#3ea76e]" strokeWidth={2.5} />
                <h3 className="text-[#3ea76e] text-[13px] font-black uppercase tracking-widest">문서 업로드</h3>
              </div>

              <label className={`flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-[24px] cursor-pointer transition-all mb-4 ${
                uploadFile
                  ? 'border-[#3ea76e] bg-[#f0faf4]'
                  : 'border-[#eee] hover:border-[#3ea76e] hover:bg-[#f9f9f9]'
              }`}>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload size={20} className={uploadFile ? 'text-[#3ea76e]' : 'text-[#ccc]'} />
                <span className={`text-[14px] font-bold ${uploadFile ? 'text-[#3ea76e]' : 'text-[#bbb]'}`}>
                  {uploadFile ? uploadFile.name : 'PDF, DOCX, TXT 파일 선택'}
                </span>
              </label>

              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="문서 ID (선택)"
                  className="flex-1 px-4 py-3 bg-[#f9f9f9] rounded-[16px] text-[13px] font-bold text-[#111] placeholder:text-[#ccc] focus:outline-none focus:ring-2 focus:ring-[#3ea76e]"
                />
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="flex-1 px-4 py-3 bg-[#f9f9f9] rounded-[16px] text-[13px] font-bold text-[#888] focus:outline-none focus:ring-2 focus:ring-[#3ea76e] appearance-none"
                >
                  <option value="">카테고리 (선택)</option>
                  <option value="FAQ">FAQ</option>
                  <option value="NOTICE">NOTICE</option>
                  <option value="POLICY">POLICY</option>
                </select>
              </div>

              {isUploadError && (
                <p className="mb-3 text-[13px] font-bold text-red-500">업로드 중 오류가 발생했습니다.</p>
              )}

              <button
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                className="w-full py-3.5 bg-[#3ea76e] text-white text-[14px] font-black rounded-[20px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#35966a] transition-colors"
              >
                {isUploading ? '업로드 중...' : '업로드'}
              </button>
            </div>

            {/* 문서 상태 */}
            {trackedDocId && docStatus && (
              <div className="p-6 md:p-8 border-b border-[#eee]">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <span className="text-[14px] font-black text-[#111] truncate">{docStatus.filename ?? trackedDocId}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {isProcessing && <Loader2 size={13} className="text-[#f59e0b] animate-spin" />}
                    {statusKey === 'processed' && <CheckCircle size={13} className="text-[#3ea76e]" />}
                    {statusKey === 'failed' && <AlertCircle size={13} className="text-red-500" />}
                    <span className={`text-[12px] font-black px-2.5 py-1 rounded-xl ${
                      statusKey === 'processed' ? 'text-[#3ea76e] bg-[#f0faf4]'
                      : statusKey === 'failed' ? 'text-red-500 bg-red-50'
                      : 'text-[#f59e0b] bg-[#fffbeb]'
                    }`}>
                      {STATUS_LABEL[statusKey] ?? statusKey}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-[#f9f9f9] rounded-2xl">
                    <p className="text-[11px] font-bold text-[#bbb] mb-1">카테고리</p>
                    <p className="text-[13px] font-black text-[#111]">{docStatus.category ?? '-'}</p>
                  </div>
                  <div className="p-3 bg-[#f9f9f9] rounded-2xl">
                    <p className="text-[11px] font-bold text-[#bbb] mb-1">청크 수</p>
                    <p className="text-[13px] font-black text-[#111]">{docStatus.chunkCount ?? 0}</p>
                  </div>
                  <div className="p-3 bg-[#f9f9f9] rounded-2xl">
                    <p className="text-[11px] font-bold text-[#bbb] mb-1">문서 ID</p>
                    <p className="text-[11px] font-black text-[#111] break-all leading-relaxed">{trackedDocId}</p>
                  </div>
                </div>

                {docStatus.errorMessage && (
                  <div className="mt-3 p-3 bg-red-50 rounded-2xl">
                    <p className="text-[12px] font-bold text-red-500">{docStatus.errorMessage}</p>
                  </div>
                )}

                {statusKey === 'processed' && (
                  <button
                    onClick={() => setShowChunks((v) => !v)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-[#eee] rounded-[16px] text-[13px] font-black text-[#888] hover:border-[#3ea76e] hover:text-[#3ea76e] transition-colors"
                  >
                    {showChunks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    청크 미리보기 ({docStatus.chunkCount}개)
                  </button>
                )}
              </div>
            )}

            {/* 청크 미리보기 */}
            {showChunks && (
              <div className="p-6 md:p-8">
                {isChunksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="text-[#3ea76e] animate-spin" />
                  </div>
                ) : chunkData?.chunks?.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {chunkData.chunks.map((chunk, i) => (
                      <div key={i} className="p-4 bg-[#f9f9f9] rounded-2xl">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[11px] font-black text-[#3ea76e] bg-[#f0faf4] px-2 py-0.5 rounded-lg shrink-0">
                            #{chunk.chunkIndex}
                          </span>
                          {chunk.header && (
                            <span className="text-[12px] font-black text-[#111] flex-1 truncate">{chunk.header}</span>
                          )}
                          <span className="text-[11px] font-bold text-[#bbb] shrink-0">{chunk.tokenCount} tokens</span>
                        </div>
                        <p className="text-[12px] font-bold text-[#888] leading-relaxed line-clamp-4">{chunk.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] font-bold text-[#ccc] text-center py-4">청크가 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== 커뮤니티 ===== */}
        <div className="mt-8">
          <div className="flex items-center gap-6 mb-10">
            <h2 className="text-[20px] font-black text-[#111] tracking-tight shrink-0">커뮤니티</h2>
            <div className="h-[1px] w-full bg-[#eee]"></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { title: 'NOTICE', link: '/notice', icon: <Info size={20} className="text-[#ccc] group-hover:text-[#3ea76e] transition-colors" />, desc: '스위피의 새로운 소식을 확인하세요.' },
              { title: 'FAQ', link: '/faq', icon: <MessageSquare size={20} className="text-[#ccc] group-hover:text-[#3ea76e] transition-colors" />, desc: '자주 묻는 질문들을 모아두었습니다.' },
            ].map((item, index) => (
              <Link
                key={index}
                to={item.link}
                className="flex items-center justify-between p-8 bg-white border border-[#eee] rounded-[32px] hover:border-[#3ea76e] hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] transition-all group"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <span className="p-2.5 bg-[#f9f9f9] rounded-2xl group-hover:bg-[#f0faf4] transition-colors">
                      {item.icon}
                    </span>
                    <span className="text-[18px] font-black tracking-tight group-hover:text-[#3ea76e] transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-[#bbb] group-hover:text-[#888] transition-colors tracking-tight pl-[52px]">
                    {item.desc}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#f9f9f9] flex items-center justify-center group-hover:bg-[#3ea76e] group-hover:text-white transition-all border border-[#eee] shrink-0">
                  <ChevronRight size={20} strokeWidth={2.5} />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default CSPage
