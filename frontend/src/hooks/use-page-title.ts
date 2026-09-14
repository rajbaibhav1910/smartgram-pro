import { useEffect } from 'react'

const BASE_TITLE = 'SmartGram Pro'

/** Sets the browser tab title per page; falls back to the app name on unmount. */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
