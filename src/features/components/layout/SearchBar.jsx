import { useRef, useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGetTrendingKeywordsQuery, useLazyGetAutocompleteQuery } from '@/api/searchApi'

export default function SearchBar() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const scrollRef = useRef(null)

  const [isSearchFocus, setIsSearchFocus] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [isDrag, setIsDrag] = useState(false)
  const [startX, setStartX] = useState(0)

  const { data: trendingKeywords = [] } = useGetTrendingKeywordsQuery()
  const [triggerAutocomplete, { data: autocompleteItems = [] }] = useLazyGetAutocompleteQuery()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsSearchFocus(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced autocomplete
  useEffect(() => {
    const trimmed = searchValue.trim()
    if (!trimmed) return
    const timer = setTimeout(() => {
      triggerAutocomplete(trimmed)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue, triggerAutocomplete])

  const handleSearch = (keyword) => {
    const term = (keyword ?? searchValue).trim()
    if (!term) return
    setSearchValue(term)
    setIsSearchFocus(false)
    navigate(`/product/list?keyword=${encodeURIComponent(term)}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const onDragStart = (e) => {
    e.preventDefault()
    setIsDrag(true)
    setStartX(e.pageX + scrollRef.current.scrollLeft)
  }
  const onDragEnd = () => setIsDrag(false)
  const onDragMove = (e) => {
    if (isDrag) scrollRef.current.scrollLeft = startX - e.pageX
  }

  const hasInput = searchValue.trim().length > 0
  const showAutocomplete = isSearchFocus && hasInput && autocompleteItems.length > 0
  const showTrending = isSearchFocus && !hasInput && trendingKeywords.length > 0

  return (
    <div ref={containerRef} className="flex-1 max-w-[500px] mx-10 relative">
      <div className={`flex items-center rounded-full px-6 py-2.5 transition-all shadow-sm ${isSearchFocus ? 'ring-2 ring-[#3ea76e] shadow-lg' : ''}`}>
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setIsSearchFocus(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 outline-none text-[15px] font-medium tracking-normal bg-transparent py-1 text-[#111] caret-[#3ea76e]"
        />
        <button
          onClick={() => handleSearch()}
          className="ml-3 text-[#111] hover:scale-110 transition-transform cursor-pointer bg-transparent border-0"
        >
          <Search size={22} strokeWidth={2.5} />
        </button>
        {isSearchFocus && (
          <button
            onClick={() => { setSearchValue(''); setIsSearchFocus(false) }}
            className="ml-4 text-[14px] font-bold text-[#999] hover:text-[#111] shrink-0 cursor-pointer bg-transparent border-0"
          >
            취소
          </button>
        )}
      </div>

      {showTrending && (
        <div className="absolute top-[calc(100%+10px)] left-0 w-full bg-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] px-7 py-8 z-[200] border border-gray-100 rounded-[24px]">
          <p className="text-[14px] font-bold text-[#1B4332] mb-5 tracking-normal flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#3ea76e] rounded-full"></span>
            인기검색어
          </p>
          <div
            ref={scrollRef}
            onMouseDown={onDragStart}
            onMouseMove={onDragMove}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide pb-2 cursor-grab active:cursor-grabbing select-none"
          >
            {trendingKeywords.map((item) => (
              <button
                key={item.keyword}
                onClick={() => { if (!isDrag) handleSearch(item.keyword) }}
                className="whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-bold text-[#1B4332] hover:bg-[#3ea76e] hover:text-white transition-all tracking-normal cursor-pointer border border-transparent bg-[#f4f7f5]"
              >
                {item.keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAutocomplete && (
        <div className="absolute top-[calc(100%+10px)] left-0 w-full bg-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] px-4 py-3 z-[200] border border-gray-100 rounded-[24px]">
          {autocompleteItems.slice(0, 8).map((item) => (
            <button
              key={item.id ?? item.title}
              onClick={() => handleSearch(item.title)}
              className="w-full text-left px-4 py-3 text-[14px] font-medium text-[#111] hover:text-[#3ea76e] hover:bg-[#f4f7f5] rounded-xl transition-all border-0 bg-transparent cursor-pointer flex items-center gap-3"
            >
              <Search size={14} className="text-[#999] shrink-0" />
              {item.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
