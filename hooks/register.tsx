import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { aim } from '../skins/aim'
import { imessage } from '../skins/imessage'
import { irc } from '../skins/irc'
import { msn } from '../skins/msn'
import type { Ctx, Skin } from '../skins/shared'
import { halfBlocks, isWide, spriteSvg } from '../skins/shared'
import type { SkinId } from '../types'

// To add a skin: write skins/<id>.tsx, import it above, list it here and in SkinId.
const SKINS: Record<Exclude<SkinId, 'off'>, Skin> = { imessage, msn, aim, irc }
const IDS = Object.keys(SKINS) as Exclude<SkinId, 'off'>[]

// The skin drawn now; `$.store` keeps the choice across sessions.
const current = atom({ plugin: 'retro-chat', key: 'skin' } as const, 'off')
const STORE_KEY = 'skin'

// Read once a session (and after each turn, for the theme): the look and the
// local clock's offset, since the sandbox's own clock may not be local.
let isDark = false
let folder = ''
let offsetMs = 0
// When each message was first drawn, by its id, so redraws keep their time.
const firstSeen = new Map<string, number>()
// Origins that are you typing: the terminal's prompt, the desktop app (an SDK host),
// and the phone or web through Remote Control. Notifications, peers and plugins keep the usual look.
const TYPED_BY_YOU = new Set(['composer', 'sdk', 'bridge'])
// Which away message the next turn shows.
let awayTurn = 0
// A turn at least this long gets the reply sound and popup: you've likely looked away.
const LONG_TURN_MS = 30_000
// userConfig `sounds`; off keeps every skin silent.
let soundsOn = true
// False for `claude -p` and SDK runs: no sign-on, sign-off, greeting or popup there.
let interactive = true
// Whether this plugin's away message is on the status line, so only ours gets cleared.
let awaySet = false
// The reply popup quotes at most this much of the answer's first line.
const POPUP_CHARS = 80

// Sound never holds up the chat: a clip that can't play (no player, off macOS) is skipped.
function play($: EngineInterface, clip: string | undefined) {
  if (soundsOn && clip !== undefined) $.audio.play({ asset: clip }).catch(() => {})
}

function signOn($: EngineInterface, skin: Skin) {
  play($, skin.sounds?.signOn)
  if (skin.popup) $.ui.toast(skin.popup.signOn)
}

const isSkinId = (value: unknown): value is SkinId => value === 'off' || IDS.includes(value as Exclude<SkinId, 'off'>)

async function readLook($: EngineInterface) {
  const theme = (await $.config.list()).find(row => row.key === 'theme')
  const wasDark = isDark
  isDark = String(theme?.value ?? '').includes('dark')
  // A theme change repaints what's already drawn, not just new messages.
  if (isDark !== wasDark) $.ui.invalidate('ui.render')
}

async function readPlace($: EngineInterface) {
  const [where, zone] = await Promise.all([$.process.run(['pwd']), $.process.run(['date', '+%z'])])
  folder = where.stdout.trim().split('/').pop() ?? ''
  const match = zone.stdout.trim().match(/^([+-])(\d{2})(\d{2})$/)
  if (match) {
    const minutes = Number(match[2]) * 60 + Number(match[3])
    offsetMs = (match[1] === '-' ? -1 : 1) * minutes * 60_000
  }
}

// The /mods switchboard turns this mod off in every chat with switches.json.
// Off draws no skin; the skin you chose stays in `$.store` for when it is back on.
let off = false
async function readSwitch($: EngineInterface) {
  let nowOff = off
  try {
    const path = `${$.plugin.root.split('/.claude/')[0] ?? ''}/.claude/mods/switches.json`
    nowOff = (await $.fs.exists(path)) && (JSON.parse(String(await $.fs.read(path))) as Record<string, unknown>)['retro-chat'] === false
  } catch {
    // A broken file changes nothing.
  }
  if (nowOff === off) return
  off = nowOff
  const stored = await $.store.get(STORE_KEY)
  await update($, current, () => (off || !isSkinId(stored) ? 'off' : stored))
  if (off && awaySet) {
    $.ui.status(undefined)
    awaySet = false
  }
  $.ui.invalidate('ui.render')
}

async function contextFor($: EngineInterface, name: string, columns: number, id?: string): Promise<Ctx> {
  const now = await $.clock.now()
  const seen = id === undefined ? now : (firstSeen.get(id) ?? now)
  if (id !== undefined) firstSeen.set(id, seen)

  return { name, at: new Date(seen + offsetMs), isDark, columns, folder }
}

export const register: Register = (on, options) => {
  const name = typeof options.name === 'string' && options.name.trim() !== '' ? options.name.trim() : 'You'
  soundsOn = options.sounds !== false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'skin',
      description: 'Skin your chat: imessage, msn, aim, irc, or off',
      argumentHint: '[imessage|msn|aim|irc|off]',
    })
    interactive = e.isInteractive
    await readSwitch($)
    $.clock.every(3000, () => void readSwitch($))
    const stored = await $.store.get(STORE_KEY)
    await Promise.all([readLook($), readPlace($)])
    if (!off && isSkinId(stored)) {
      await update($, current, () => stored)
      if (stored !== 'off' && interactive) {
        if (SKINS[stored].greetsOnStart) $.ui.log(SKINS[stored].hello(await contextFor($, name, 80)))
        signOn($, SKINS[stored])
      }
    }

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    const id = await read($, current)
    const clip = id === 'off' ? undefined : SKINS[id].sounds?.signOff
    // A /clear keeps the skin on, so the door stays open; exit waits for it to
    // close, but never past the session's end bound.
    if (soundsOn && interactive && e.reason !== 'clear' && clip !== undefined) await $.audio.play({ asset: clip }, { signal: next.signal }).catch(() => {})

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    const id = await read($, current)
    const away = id === 'off' ? undefined : SKINS[id].away
    if (e.agentId === undefined && away !== undefined) {
      $.ui.status(`Claude is away: ${away[awayTurn++ % away.length]}`)
      awaySet = true
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    await readLook($)
    if (awaySet) {
      $.ui.status(undefined)
      awaySet = false
    }
    const id = await read($, current)
    // Only a real answer after a long turn: not an interrupt, an error or a refusal.
    if (id !== 'off' && e.reason === 'answer' && e.durationMs >= LONG_TURN_MS) {
      const skin = SKINS[id]
      play($, skin.sounds?.receive)
      const firstLine = e.answer.trim().split('\n')[0] ?? ''
      const quoted = firstLine.length > POPUP_CHARS ? `${firstLine.slice(0, POPUP_CHARS - 1)}…` : firstLine
      if (skin.popup?.reply && quoted && interactive) $.ui.toast(skin.popup.reply(quoted))
    }

    return next(e)
  })

  on('command.run', { command: 'skin' }, async ($, e) => {
    if (off) return { text: 'Retro Chat is off. Turn it on with /mods.' }
    const asked = e.args.trim().toLowerCase()
    const now = await read($, current)

    if (asked === '') {
      const list = [...IDS, 'off'].map(id => (id === now ? `${id} (on)` : id)).join(', ')
      return { text: `Skins: ${list}. Type /skin <name> to switch.` }
    }
    if (!isSkinId(asked)) {
      return { text: `No skin called "${asked}". Skins: ${[...IDS, 'off'].join(', ')}.` }
    }

    await update($, current, () => asked)
    await $.store.set(STORE_KEY, asked)
    if (now !== 'off' && now !== asked) {
      play($, SKINS[now].sounds?.signOff)
      if (awaySet) {
        $.ui.status(undefined)
        awaySet = false
      }
    }
    if (asked === 'off') return { text: 'Skins off. Back to the usual look.' }

    if (now !== asked) signOn($, SKINS[asked])
    return { text: SKINS[asked].hello(await contextFor($, name, 80)) }
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const id = await read($, current)
    if (id === 'off' || !TYPED_BY_YOU.has(e.props.origin.kind)) return next(e)

    const ctx = await contextFor($, name, e.viewport?.columns ?? 80, e.requestId)

    return SKINS[id].user($.ui.resolve(e), e.props.text, ctx)
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const id = await read($, current)
    if (id === 'off' || e.props.isSummary) return next(e)

    const ctx = await contextFor($, name, e.viewport?.columns ?? 80, e.requestId)
    const drawn = isWide(e.props.text) ? await next(e) : undefined

    return SKINS[id].assistant($.ui.resolve(e), e.props.text, e.props.isFirstOfReply, ctx, drawn)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const id = await read($, current)
    const skin = id === 'off' ? undefined : SKINS[id]
    if (skin?.spinner === undefined) return next(e)

    const suffix = skin.spinnerSuffix ?? e.props.suffix
    const ui = $.ui.resolve(e)
    // While the engine shows a state message in place of the word (a wait, a
    // compaction), the skin draws no word of its own: the message stays readable.
    const isTyping = e.props.message === null
    // iMessage on desktop: just the typing bubble, as the real app shows it.
    if (isTyping && e.surface === 'desktop' && 'Svg' in ui && skin.typingSvg) {
      const { Svg } = ui
      return <Svg source={skin.typingSvg(isDark)} alt="Claude is typing" isInteractive />
    }
    const ownWord = isTyping && skin.spinnerColour !== undefined
    const engine = await next({ ...e, props: { ...e.props, word: ownWord ? '' : skin.spinner, suffix } })
    const { Box, Text } = ui
    const drawn = ownWord ? (
      <Box flexDirection="row">
        <Text color={skin.spinnerColour}>{skin.spinner}</Text>
        {engine}
      </Box>
    ) : (
      engine
    )
    if (skin.sprite === undefined) return drawn

    const { colour, frames } = skin.sprite
    const tint = typeof colour === 'string' ? colour : colour[isDark ? 'dark' : 'light']
    // Desktop draws SVG with real square pixels, animated inside the SVG itself:
    // its text has line gaps, so half-blocks there come out as bars.
    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      return (
        <Box flexDirection="row" alignItems="center">
          <Svg source={spriteSvg(frames, tint)} alt="Claude's sprite, typing" isInteractive />
          <Box marginLeft={1}>{drawn}</Box>
        </Box>
      )
    }
    // The terminal draws half-blocks; surfaces with neither (vscode) keep the plain line.
    if (!('Client' in ui)) return drawn

    const { Client } = ui
    const props = { frames: [halfBlocks(frames[0]), halfBlocks(frames[1])], colour: tint }

    return (
      <Box flexDirection="row" alignItems="center">
        <Client key="sprite" module="./sprite.tsx" props={props} width={18} height={4} />
        <Box>{drawn}</Box>
      </Box>
    )
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const id = await read($, current)
    const skin = id === 'off' ? undefined : SKINS[id]
    if (skin?.turnLine === undefined || e.props.waitingFor !== undefined) return next(e)

    const ctx = await contextFor($, name, e.viewport?.columns ?? 80, e.requestId)

    return skin.turnLine($.ui.resolve(e), e.props.durationMs, ctx)
  })
}
