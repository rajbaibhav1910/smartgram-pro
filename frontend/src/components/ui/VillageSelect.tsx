import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Loader2, Check } from 'lucide-react'
import { fetchWithAuth } from '../../services/api'
import { cn } from '../../lib/utils'

export interface Village {
  name: string
  district: string
  sub_district: string
  state: string
}

interface VillageSelectProps {
  id: string
  value: string
  onChange: (village: Village | null) => void
  error?: string
}

/** Searchable village picker over the /api/villages directory (all of India).
 *  Debounced combobox with keyboard navigation. */
export default function VillageSelect({ id, value, onChange, error }: VillageSelectProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const debounced = useDebouncedValue(query.trim(), 300)

  const { data, isFetching } = useQuery({
    queryKey: ['villages', debounced],
    queryFn: () =>
      fetchWithAuth<{ villages: Village[] }>(
        `/villages?search=${encodeURIComponent(debounced)}&limit=50`,
      ),
    enabled: open && debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  })

  const results = data?.villages ?? []

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Keep the highlighted option in view
  useEffect(() => {
    const el = listRef.current?.children[highlighted] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  const select = (v: Village) => {
    onChange(v)
    setQuery('')
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (!open) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlighted((h) => Math.min(h + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted((h) => Math.max(h - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[highlighted]) select(results[highlighted])
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {/* Selected village chip / search box */}
      {value ? (
        <div
          className={cn(
            'flex items-center justify-between gap-2 w-full px-3 py-2 border rounded-lg bg-surface text-ink',
            error ? 'border-danger' : 'border-border',
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <MapPin size={15} className="text-primary shrink-0" />
            <span className="truncate">{value}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[0.75rem] font-medium text-text-muted hover:text-danger shrink-0"
            aria-label={t('auth.changeVillage')}
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
          />
          <input
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            aria-autocomplete="list"
            aria-autofocus={false}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setHighlighted(0)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t('auth.searchVillage')}
            className={cn(
              'w-full pl-9 pr-9 py-2 border rounded-lg bg-surface text-ink placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              error ? 'border-danger' : 'border-border',
            )}
          />
          {isFetching && (
            <Loader2
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint animate-spin"
            />
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[0.8rem] text-danger mt-1.5">
          {error}
        </p>
      )}

      {/* Dropdown */}
      {open && !value && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label={t('auth.villageSuggestions')}
          className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg py-1"
        >
          {debounced.length < 2 ? (
            <li className="px-3 py-2.5 text-sm text-text-muted" role="option" aria-selected="false" aria-disabled="true">
              {t('auth.searchHint')}
            </li>
          ) : isFetching && results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-text-muted" role="option" aria-selected="false" aria-disabled="true">
              {t('auth.searching')}
            </li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-text-muted" role="option" aria-selected="false" aria-disabled="true">
              {t('auth.noVillages', { query: debounced })}
            </li>
          ) : (
            results.map((v, i) => {
              return (
                <li key={`${v.name}-${v.district}-${v.state}`} role="option" aria-selected={i === highlighted}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => select(v)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors',
                      i === highlighted ? 'bg-primary-subtle' : 'bg-transparent',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-ink block truncate">{v.name}</span>
                      <span className="text-[0.75rem] text-text-muted block truncate">
                        {v.sub_district ? `${v.sub_district} · ` : ''}{v.district}, {v.state}
                      </span>
                    </span>
                    {i === highlighted && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
