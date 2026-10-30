// fun-isometric in React: one canvas sized by css, on the shared page clock, recoloured and replayed without remounting.
import { useEffect, useRef } from 'react'
import { play } from './fun'
import type { CSSProperties } from 'react'
import type { Icon, PlayOptions, Player } from './fun'

type Props = PlayOptions & {
  icon: Icon
  replayOnHover?: boolean
  label?: string // accessible name, the icon's name by default
  className?: string
  style?: CSSProperties
}

export function Sticker({ icon, palette, loop, offset, enter, replayOnHover, label, className, style }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const player = useRef<Player | null>(null)
  const opts = useRef<PlayOptions>({ palette, loop, offset, enter })
  // A new icon starts a new player; options reach the running one through set(), so the entrance never replays.
  useEffect(() => {
    if (!ref.current) return
    const p = play(ref.current, icon, opts.current)
    player.current = p
    return () => p.stop()
  }, [icon])
  // Keyed on palette content, so an equivalent inline object does not repaint every render.
  const tone = JSON.stringify(palette ?? null)
  useEffect(() => {
    const next = { palette, loop, offset, enter }
    opts.current = next
    player.current?.set(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tone is the intentional content key for palette.
  }, [tone, loop, offset, enter])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label ?? icon.name}
      className={className}
      style={{ display: 'block', width: '100%', aspectRatio: '1', ...style }}
      onPointerEnter={replayOnHover ? () => player.current?.replay() : undefined}
    />
  )
}
