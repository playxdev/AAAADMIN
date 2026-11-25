import { useEffect, useState } from 'react'

// Same alphabet as AAAAPI codes, so the roll looks like a real code.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
// Decorative only (Math.random is fine here); real codes come from crypto.
const randomChars = (n: number) =>
  Array.from(
    { length: n },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('')

// ~1s roll, then ~0.8s left-to-right reveal (20 chars x 40ms), then it stops.
const ROLL_MS = 1000
const REVEAL_STEP_MS = 40

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Slot-machine reveal: every new `value` rolls briefly, then settles on it. */
export function ScrambleCode({ value }: { value: string }) {
  const [text, setText] = useState(() => randomChars(value.length))

  useEffect(() => {
    if (reducedMotion()) return
    const start = Date.now() + ROLL_MS
    const id = setInterval(() => {
      const i = Math.floor((Date.now() - start) / REVEAL_STEP_MS)
      setText(
        i < 0
          ? randomChars(value.length)
          : value.slice(0, i) + randomChars(Math.max(0, value.length - i))
      )
      if (i >= value.length) clearInterval(id)
    }, 40)
    return () => clearInterval(id)
  }, [value])

  return (
    <>
      <span aria-hidden>{reducedMotion() ? value : text}</span>
      {/* Screen readers get the code itself, not every frame. */}
      <span className='sr-only'>{value}</span>
    </>
  )
}
