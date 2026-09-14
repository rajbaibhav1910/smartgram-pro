import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/** Animates a number from 0 to `target` once on mount (rAF, ~700ms).
 *  Returns the target immediately when reduced motion is preferred. */
export function useCountUp(target: number): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    const start = performance.now()
    const duration = 700
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, reduced])

  return value
}
