import { useEffect, useState, RefObject } from "react"

export function useResizeObserver(ref: RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!ref.current) return

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        setDimensions({ width, height })
      }
    })

    resizeObserver.observe(ref.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [ref])

  return dimensions
}

