'use client'

import { cn } from '@/lib/utils'
import { useEffect, useMemo, useRef, useState } from 'react'

type Stage = 'ask' | 'planner' | 'research' | 'writer' | 'critic'
type Status = 'pending' | 'in_progress' | 'done'

export interface UltraTimelineItem {
  stage: Stage
  headerTitle: string
  headerText?: string
  resultTitle?: string
  resultText?: string
  render?: React.ReactNode
  status: Status
}

export function UltraTimeline({ items }: { items: UltraTimelineItem[] }) {
  if (!items || items.length === 0) return null
  const ordered: UltraTimelineItem[] = order(items)

  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const prevInProgressRef = useRef<Stage | null>(null)
  const [highlightTop, setHighlightTop] = useState<number | null>(null)
  const [highlightHeight, setHighlightHeight] = useState<number>(0)
  const [highlightVisible, setHighlightVisible] = useState(false)
  const [headTop, setHeadTop] = useState<number | null>(null)
  const [headVisible, setHeadVisible] = useState(false)
  const [shimmerStage, setShimmerStage] = useState<Stage | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const afterShimmerTimeoutRef = useRef<number | null>(null)

  const currentInProgress: Stage | null = useMemo(() => {
    // Prefer the latest in_progress by stage order: ask -> planner -> research -> writer -> critic
    const order: Stage[] = ['ask', 'planner', 'research', 'writer', 'critic']
    for (const s of order) {
      const it = ordered.find(i => i.stage === s && i.status === 'in_progress')
      if (it) return s
    }
    return null
  }, [ordered])

  const lastDoneStage: Stage | null = useMemo(() => {
    const order: Stage[] = ['ask', 'planner', 'research', 'writer', 'critic']
    for (let i = order.length - 1; i >= 0; i--) {
      const it = ordered.find(x => x.stage === order[i] && x.status === 'done')
      if (it) return it.stage
    }
    return null
  }, [ordered])

  useEffect(() => {
    const next = currentInProgress
    const prev = prevInProgressRef.current
    if (!next) return
    // Trigger animation only when a new in_progress appears
    if (prev !== next && containerRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (afterShimmerTimeoutRef.current) clearTimeout(afterShimmerTimeoutRef.current)
      const fromStage = lastDoneStage
      const toStage = next
      if (!fromStage) {
        prevInProgressRef.current = next
        return
      }
      const fromEl = itemRefs.current[fromStage]
      const toEl = itemRefs.current[toStage]
      if (!fromEl || !toEl) {
        prevInProgressRef.current = next
        return
      }
      // Compute tops relative to container
      const containerTop = containerRef.current.getBoundingClientRect().top
      const fromTop = fromEl.getBoundingClientRect().top - containerTop + 4
      const toTop = toEl.getBoundingClientRect().top - containerTop + 4
      // JS-driven incremental growth
      const duration = 1000
      const start = performance.now()
      const total = Math.max(0, toTop - fromTop)

      setHighlightVisible(true)
      setHeadVisible(true)
      setHighlightTop(fromTop)
      setHighlightHeight(0)
      setHeadTop(fromTop)

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
      const step = (now: number) => {
        const elapsed = now - start
        const t = Math.min(1, elapsed / duration)
        const k = easeOutCubic(t)
        const h = total * k
        setHighlightHeight(h)
        setHeadTop(fromTop + h)
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(step)
        } else {
          setHighlightVisible(false)
          setHeadVisible(false)
          setShimmerStage(toStage)
          afterShimmerTimeoutRef.current = window.setTimeout(() => {
            setShimmerStage(null)
          }, 900)
        }
      }
      animFrameRef.current = requestAnimationFrame(step)
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (afterShimmerTimeoutRef.current) clearTimeout(afterShimmerTimeoutRef.current)
      }
    }
    prevInProgressRef.current = next
  }, [currentInProgress, lastDoneStage])

  return (
    <div ref={containerRef} className="relative pl-5 py-2">
      <div className="absolute left-1 top-0 bottom-0 w-px bg-border" />

      {/* Line progress highlight (faint trail) */}
      {highlightVisible && highlightTop !== null && (
        <span
          className="pointer-events-none absolute left-[2px] w-[2px] rounded bg-purple-500/25"
          style={{ top: highlightTop, height: highlightHeight }}
        />
      )}
      {/* Moving head segment (bright tip) */}
      {headVisible && headTop !== null && (
        <span
          className="pointer-events-none absolute left-[2px] h-3 w-[2px] rounded bg-purple-500 shadow-[0_0_8px_2px_rgba(147,51,234,0.5)]"
          style={{ top: headTop }}
        />
      )}

      <ul className="space-y-3">
        {ordered.map((it, idx) => (
          <li
            key={`${it.stage}-${idx}`}
            className="relative"
            ref={el => {
              itemRefs.current[it.stage] = el
            }}
          >
            <span
              className={cn(
                'absolute -left-[22px] top-1 inline-block h-3 w-3 rounded-full ring-2 ring-background',
                it.status === 'in_progress'
                  ? 'bg-purple-600'
                  : it.status === 'done'
                    ? 'bg-muted-foreground'
                    : 'bg-border'
              )}
              aria-hidden
            />

            <div className="flex flex-col gap-1">
              <div className={cn('text-sm font-medium leading-5')}>
                <span
                  className={cn(
                    shimmerStage === it.stage
                      ? 'bg-gradient-to-r from-foreground via-purple-600 to-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-[text-sweep_900ms_ease-in-out_1]'
                      : ''
                  )}
                >
                  {it.headerTitle}
                </span>
              </div>
              {renderBody(it)}
            </div>
          </li>
        ))}
      </ul>

      {/* Text sweep keyframes */}
      <style jsx>{`
        @keyframes text-sweep {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}

function renderBody(it: UltraTimelineItem) {
  if (it.render) {
    return (
      <div>
        {it.resultTitle && (
          <div className="font-medium text-foreground/80 mb-1">{it.resultTitle}</div>
        )}
        <div>{it.render}</div>
      </div>
    )
  }
  if (it.status === 'in_progress' && !it.resultText) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 bg-purple-600 rounded-full animate-pulse" />
        <span className="text-xs text-muted-foreground">Waiting for results…</span>
      </div>
    )
  }
  if (!it.resultText) return null
  return (
    <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
      {it.resultTitle && (
        <div className="font-medium text-foreground/80 mb-1">{it.resultTitle}</div>
      )}
      {it.resultText}
    </div>
  )
}

function order(items: UltraTimelineItem[]): UltraTimelineItem[] {
  const rank: Record<Stage, number> = { ask: -1, planner: 0, research: 1, writer: 2, critic: 3 }
  return [...items].sort((a, b) => rank[a.stage] - rank[b.stage])
}


