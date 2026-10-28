import { useCallback, useEffect, useRef, useState } from 'react'

export function useCountdown(totalSeconds, { running = true, onExpire } = {}) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const deadline = useRef(null)
  const expired = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    if (!running) return undefined
    if (deadline.current === null) deadline.current = Date.now() + totalSeconds * 1000

    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0 && !expired.current) {
        expired.current = true
        clearInterval(id)
        onExpireRef.current?.()
      }
    }, 250)

    return () => clearInterval(id)
  }, [running, totalSeconds])

  const getElapsed = useCallback(() => {
    if (deadline.current === null) return 0
    const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
    return Math.min(totalSeconds, totalSeconds - left)
  }, [totalSeconds])

  return { remaining, getElapsed }
}