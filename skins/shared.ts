import type { EngineInterface, RenderElement } from 'claude-code'

// The elements a skin draws with: the surface's own table.
export type Ui = ReturnType<EngineInterface['ui']['resolve']>

export type Ctx = {
  // The name your messages show under (userConfig `name`).
  name: string
  // When the message was first drawn, shifted to local time: read it with the UTC getters.
  at: Date
  isDark: boolean
  columns: number
  // The working folder's name, for IRC's channel.
  folder: string
}

export type Skin = {
  id: string
  label: string
  user: (ui: Ui, text: string, ctx: Ctx) => RenderElement
  // `drawn` is Claude Code's own drawing of a block with a table or code,
  // which the skin wraps rather than restyles.
  assistant: (ui: Ui, text: string, isFirst: boolean, ctx: Ctx, drawn?: RenderElement) => RenderElement
  // The spinner's word while Claude works; absent keeps Claude Code's.
  spinner?: string
  // What follows the spinner's word in place of Claude Code's ellipsis.
  spinnerSuffix?: string
  // The spinner's word in this colour, drawn by the skin; the engine draws the rest of the line.
  spinnerColour?: string
  // Clips under sounds/, played on sign-on and sign-off, and when Claude ends a long turn.
  sounds?: { signOn?: string; signOff?: string; receive?: string }
  // Toasts: one on sign-on, and one with the reply's first line after a long turn.
  popup?: { signOn: string; reply?: (firstLine: string) => string }
  // Away messages for the status line while Claude works, taken in turn.
  away?: string[]
  // A two-frame pixel sprite that marches beside the spinner: 8 rows of 'X' (lit) and '.'.
  sprite?: { colour: string | { light: string; dark: string }; frames: [string[], string[]] }
  // Desktop only: an animated SVG drawn alone in place of the spinner line and the sprite.
  typingSvg?: (isDark: boolean) => string
  // The line that closes a turn; absent keeps Claude Code's.
  turnLine?: (ui: Ui, durationMs: number, ctx: Ctx) => RenderElement
  // What the chat says when the skin is switched on.
  hello: (ctx: Ctx) => string
  // Whether that line is also logged when a session starts (a sign-on, a channel join).
  greetsOnStart: boolean
}

// Bubble width: the longest line plus padding and border, capped at 70% of the terminal.
export function bubbleWidth(text: string, columns: number) {
  const longest = Math.max(...text.split('\n').map(line => line.length))
  return Math.min(longest + 6, Math.floor(columns * 0.7))
}

// Two pixel rows per text row: ▀ top lit, ▄ bottom lit, █ both.
export function halfBlocks(frame: string[]) {
  const rows: string[] = []
  for (let y = 0; y < frame.length; y += 2) {
    const top = frame[y] ?? ''
    const bottom = frame[y + 1] ?? ''
    rows.push(
      [...top].map((px, x) => (px === 'X' ? (bottom[x] === 'X' ? '█' : '▀') : bottom[x] === 'X' ? '▄' : ' ')).join(''),
    )
  }
  return rows
}

// The same sprite as pixels for surfaces that draw SVG (desktop): square pixels in
// the skin's colour, the frames swapping and the sprite marching as on the terminal.
export function spriteSvg(frames: [string[], string[]], colour: string, px = 4) {
  const width = Math.max(...frames.flat().map(row => row.length))
  const group = (frame: string[], values: string) => {
    const rects = frame.flatMap((row, y) =>
      [...row.matchAll(/X+/g)].map(run => `<rect x="${(run.index ?? 0) * px}" y="${y * px}" width="${run[0].length * px}" height="${px}"/>`),
    )
    return `<g visibility="hidden"><animate attributeName="visibility" values="${values}" dur="0.8s" calcMode="discrete" repeatCount="indefinite"/>${rects.join('')}</g>`
  }
  const steps = [0, 1, 2, 3, 4, 5].map(step => `${step * px} 0`).join(';')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(width + 6) * px}" height="${8 * px}" shape-rendering="crispEdges" fill="${colour}">` +
    `<g><animateTransform attributeName="transform" type="translate" values="${steps}" dur="2.4s" calcMode="discrete" repeatCount="indefinite"/>` +
    group(frames[0], 'visible;hidden') +
    group(frames[1], 'hidden;visible') +
    '</g></svg>'
  )
}

// Tables and code blocks draw wider than a skin's layout, so Claude Code draws them.
export const isWide = (text: string) => text.includes('```') || /^\s*\|/m.test(text)

const pad = (n: number) => String(n).padStart(2, '0')

// 17:24
export const clock24 = (at: Date) => `${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`

// 5:24 PM, or 5:24:03 PM with seconds
export function clock12(at: Date, withSeconds = false) {
  const hours = at.getUTCHours() % 12 || 12
  const seconds = withSeconds ? `:${pad(at.getUTCSeconds())}` : ''
  return `${hours}:${pad(at.getUTCMinutes())}${seconds} ${at.getUTCHours() < 12 ? 'AM' : 'PM'}`
}

// 10/25/2026
export function date(at: Date) {
  return `${at.getUTCMonth() + 1}/${at.getUTCDate()}/${at.getUTCFullYear()}`
}

// 34s, 1m 4s
export function duration(ms: number) {
  const seconds = Math.round(ms / 1000)
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}
