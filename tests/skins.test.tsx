import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

// `/skin <id>` as typed at the prompt.
const skinCommand = (args: string) =>
  ({
    command: 'skin',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 120 },
  }) as const

// 00:24:03 UTC, which the faked `date +%z` (-0700) makes 5:24:03 PM the day before.
const NOW = Date.UTC(2026, 9, 26, 0, 24, 3)

const message = (surface: (typeof SURFACES)[number], text: string) =>
  ({
    plugin: 'retro-chat',
    surface,
    component: 'UserMessage',
    requestId: 'm1',
    props: { text, origin: { kind: 'composer' }, isExpanded: true },
  }) as const

const reply = (surface: (typeof SURFACES)[number], text: string) =>
  ({
    plugin: 'retro-chat',
    surface,
    component: 'AssistantMessage',
    requestId: 'r1',
    props: { text, isFirstOfReply: true },
  }) as const

// What each skin must show for your message and for Claude's reply.
const EXPECT = {
  imessage: { you: /Delivered/, claude: /^Claude$/ },
  msn: { you: /^HG says:$/, claude: /^Claude says:$/ },
  aim: { you: /5:24:03 PM/, claude: /5:24:03 PM/ },
  irc: { you: /\[17:24\]/, claude: /\[17:24\]/ },
} as const

test('each skin draws your message and the reply, on terminal and desktop', { options: { name: 'HG' } }, async ($, on) => {
  // Nothing sits beneath the plugin: these hooks stand for the engine.
  mock.store(on)
  mock.clock(on, { now: NOW })
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('config.list', () => ({ value: [] }))
  on('process.run', ($, e) => ({
    value: { exitCode: 0, stdout: e.argv[0] === 'pwd' ? '/Users/hg/kessel\n' : '-0700\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/Users/hg/kessel', surface: 'terminal', isInteractive: true })

  for (const [id, want] of Object.entries(EXPECT)) {
    const switched = await $.command.run(skinCommand(id))
    expect(switched.text).not.toMatch(/No skin/)

    for (const surface of SURFACES) {
      const mine = await $.ui.mount(message(surface, 'fix the footer'))
      expect(await mine.find({ type: 'Text', text: /fix the footer/ })).toBeDefined()
      expect(await mine.find({ type: 'Text', text: want.you })).toBeDefined()
      await mine.unmount()

      // The desktop app sends what you type as an SDK host.
      const fromApp = await $.ui.mount({ ...message(surface, 'fix the footer'), props: { text: 'fix the footer', origin: { kind: 'sdk' }, isExpanded: true } })
      expect(await fromApp.find({ type: 'Text', text: want.you })).toBeDefined()
      await fromApp.unmount()

      const theirs = await $.ui.mount(reply(surface, 'Done.'))
      expect(await theirs.find({ type: 'Text', text: want.claude })).toBeDefined()
      await theirs.unmount()
    }
  }
})

test('a reply with a table keeps the engine drawing, under the skin label', async ($, on) => {
  mock.store(on, { skin: 'imessage' })
  mock.clock(on, { now: NOW })
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('config.list', () => ({ value: [] }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '-0700\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount(reply('terminal', '| a | b |\n|---|---|\n| 1 | 2 |'))

  expect(await ui.find({ type: 'Text', text: /^engine$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Claude$/ })).toBeDefined()
  await ui.unmount()
})

test('off, and messages not typed at the prompt, keep the usual look', async ($, on) => {
  mock.store(on, { skin: 'off' })
  mock.clock(on, { now: NOW })
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('config.list', () => ({ value: [] }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '-0700\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const off = await $.ui.mount(message('terminal', 'hello'))
  expect((await off.find({ type: 'Text' }))?.text).toBe('engine')
  await off.unmount()

  await $.command.run(skinCommand('irc'))
  const notice = await $.ui.mount({
    ...message('terminal', 'task done'),
    props: { text: 'task done', origin: { kind: 'task-notification' }, isExpanded: true },
  })
  expect((await notice.find({ type: 'Text' }))?.text).toBe('engine')
  await notice.unmount()
})

test('sounds, the MSN popup, the AIM away message and the iMessage dots', { options: { name: 'HG' } }, async ($, on) => {
  const played: string[] = []
  const toasts: string[] = []
  const statuses: (string | undefined)[] = []
  mock.store(on)
  const clock = mock.clock(on, { now: NOW })
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('config.list', () => ({ value: [] }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '-0700\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('audio.play', (_, e) => (played.push('asset' in e.clip ? String(e.clip.asset) : ''), { value: undefined }))
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))
  on('ui.status', (_, e) => (statuses.push(e.text), { value: undefined }))
  // The engine's spinner, drawn with whatever word and suffix the plugin hands down.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    const props = e.props as { word?: string; suffix?: string }

    return <Text>{`${props.word ?? ''}${props.suffix ?? ''}`}</Text>
  })
  // Sounds and toasts are fired, not awaited: let them land.
  const settle = () => clock.advance(0)

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  await $.command.run(skinCommand('msn'))
  await settle()
  expect(played).toContain('sounds/msn-signin.wav')
  expect(toasts).toContain('Claude has just signed in.')

  // A long MSN turn pops up the reply's first line.
  await $.turn.complete({ answer: 'Fixed the footer.\nMore below.', durationMs: 45_000, isAborted: false, turnId: 't0', reason: 'answer' })
  await settle()
  expect(toasts).toContain('Claude says: Fixed the footer.')
  expect(played).toContain('sounds/msn-message.wav')

  await $.command.run(skinCommand('aim'))
  await settle()
  expect(played).toContain('sounds/aim-door-open.wav')

  await $.turn.start({ text: 'hi', turnId: 't1' })
  expect(statuses.at(-1)).toMatch(/^Claude is away: /)
  // A quick turn ends quietly; a long one gets the IM sound.
  await $.turn.complete({ answer: 'Done.', durationMs: 2000, isAborted: false, turnId: 't1', reason: 'answer' })
  await settle()
  expect(statuses.at(-1)).toBeUndefined()
  expect(played).not.toContain('sounds/aim-im.wav')
  await $.turn.complete({ answer: 'Done.', durationMs: 40_000, isAborted: false, turnId: 't2', reason: 'answer' })
  await settle()
  expect(played).toContain('sounds/aim-im.wav')

  // Leaving AIM shuts the door.
  await $.command.run(skinCommand('imessage'))
  await settle()
  expect(played).toContain('sounds/aim-door-close.wav')

  const spinner = await $.ui.mount({
    plugin: 'retro-chat',
    surface: 'terminal',
    component: 'Spinner',
    requestId: 's1',
    props: { word: 'Sauteing', message: null, suffix: '…', mode: 'responding' },
  })
  expect((await spinner.find({ type: 'Text' }))?.text).toBe('•••')
  // In iMessage's gray, not the engine's spinner colour.
  expect(JSON.stringify(await spinner.drawn())).toContain('#8E8E93')
  await spinner.unmount()
})

test('sounds off keeps every skin silent, the popups still show', { options: { name: 'HG', sounds: false } }, async ($, on) => {
  const played: string[] = []
  const toasts: string[] = []
  mock.store(on)
  const clock = mock.clock(on, { now: NOW })
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('config.list', () => ({ value: [] }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '-0700\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('audio.play', (_, e) => (played.push('asset' in e.clip ? String(e.clip.asset) : ''), { value: undefined }))
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(skinCommand('msn'))
  await $.turn.complete({ answer: 'Done.', durationMs: 40_000, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(0)

  expect(played).toEqual([])
  expect(toasts).toContain('Claude has just signed in.')
})

test('the spinner sprite marches beside the line, and swaps frames', async ($, on) => {
  mock.store(on, { skin: 'aim' })
  mock.clock(on, { now: NOW })
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('config.list', () => ({ value: [] }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '-0700\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    const props = e.props as { word?: string }

    return <Text>{props.word ?? 'engine'}</Text>
  })
  const spinnerOn = (surface: (typeof SURFACES)[number]) =>
    $.ui.mount({
      plugin: 'retro-chat',
      surface,
      component: 'Spinner',
      requestId: 's1',
      props: { word: 'Sauteing', message: null, suffix: '…', mode: 'responding' },
    })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await spinnerOn('terminal')
  expect(await ui.find({ type: 'Text', text: /^Claude is typing$/ })).toBeDefined()
  // The running buddy's arms, first frame, then the second after 400 ms.
  const sprite = async () => JSON.stringify(await ui.drawn({ in: 'sprite' }))
  expect(await sprite()).toContain(' ▄▀██▀▄')
  await ui.advance(400)
  expect(await sprite()).toContain('▄▀▀██▀ ▄')
  await ui.unmount()

  // Desktop gets real pixels: an SVG that animates itself.
  const desktop = await spinnerOn('desktop')
  const svg = await desktop.find({ type: 'Svg' })
  expect(JSON.stringify(svg)).toContain('<animate')
  expect(JSON.stringify(svg)).toContain('"isInteractive":true')
  expect(await desktop.find({ type: 'Text', text: /^Claude is typing$/ })).toBeDefined()
  await desktop.unmount()

  // iMessage on desktop: only the typing bubble, its three dots pulsing.
  await $.command.run(skinCommand('imessage'))
  const bubble = await spinnerOn('desktop')
  const typing = JSON.stringify(await bubble.drawn())
  expect(typing).toContain('Claude is typing')
  expect(typing.match(/<animate attributeName=\\"opacity\\"/g)?.length).toBe(3)
  expect(typing).not.toContain('Sauteing')
  await bubble.unmount()

  await $.command.run(skinCommand('off'))
  const off = await spinnerOn('terminal')
  expect((await off.find({ type: 'Text' }))?.text).toBe('Sauteing')
  await off.unmount()
})

// The hooks beneath the plugin that every edge-case test below needs.
function engine(on: On, record: { played: string[]; toasts: string[]; statuses: (string | undefined)[] }) {
  mock.store(on, { skin: 'aim' })
  const clock = mock.clock(on, { now: NOW })
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('config.list', () => ({ value: [] }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '-0700\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.log', () => ({ value: undefined }))
  on('audio.play', (_, e) => (record.played.push('asset' in e.clip ? String(e.clip.asset) : ''), { value: undefined }))
  on('ui.toast', (_, e) => (record.toasts.push(e.text), { value: undefined }))
  on('ui.status', (_, e) => (record.statuses.push(e.text), { value: undefined }))

  return clock
}

const turn = (durationMs: number, extra: object = {}) =>
  ({ answer: 'Done.', durationMs, isAborted: false, turnId: 't', reason: 'answer', ...extra }) as const

test('only a real answer after 30s or more makes a sound; subagents and interrupts stay quiet', async ($, on) => {
  const record = { played: [] as string[], toasts: [] as string[], statuses: [] as (string | undefined)[] }
  const clock = engine(on, record)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  // Restoring the stored skin opens the door.
  await clock.advance(0)
  expect(record.played).toEqual(['sounds/aim-door-open.wav'])
  record.played.length = 0

  await $.turn.complete(turn(29_999))
  await $.turn.complete(turn(60_000, { reason: 'aborted', isAborted: true }))
  await $.turn.complete(turn(60_000, { reason: 'error' }))
  await $.turn.complete(turn(60_000, { agentId: 'helper' }))
  await clock.advance(0)
  expect(record.played).toEqual([])

  await $.turn.complete(turn(30_000))
  await clock.advance(0)
  expect(record.played).toEqual(['sounds/aim-im.wav'])

  // A subagent's turn sets no away message.
  await $.turn.start({ text: '', turnId: 'a1', agentId: 'helper' })
  expect(record.statuses).toEqual([])
})

test('the status line is only cleared when the away message was ours', async ($, on) => {
  const record = { played: [] as string[], toasts: [] as string[], statuses: [] as (string | undefined)[] }
  engine(on, record)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(skinCommand('msn'))

  await $.turn.start({ text: 'hi', turnId: 't1' })
  await $.turn.complete(turn(1000))
  // MSN has no away message, so another plugin's status line is left alone.
  expect(record.statuses).toEqual([])
})

test('scripted runs make no sound or popup', async ($, on) => {
  const record = { played: [] as string[], toasts: [] as string[], statuses: [] as (string | undefined)[] }
  const clock = engine(on, record)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: false })
  await $.session.end({ reason: 'other', sessionId: 's1', resume: { id: 's1' } })
  await clock.advance(0)
  expect(record.played).toEqual([])
  expect(record.toasts).toEqual([])
})

test('/clear keeps the door open; leaving closes it', async ($, on) => {
  const record = { played: [] as string[], toasts: [] as string[], statuses: [] as (string | undefined)[] }
  const clock = engine(on, record)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(0)
  record.played.length = 0

  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
  await clock.advance(0)
  expect(record.played).toEqual([])

  await $.session.end({ reason: 'prompt_input_exit', sessionId: 's2', resume: { id: 's2' } })
  expect(record.played).toEqual(['sounds/aim-door-close.wav'])
})

test('a long first line is cut short in the popup', async ($, on) => {
  const record = { played: [] as string[], toasts: [] as string[], statuses: [] as (string | undefined)[] }
  const clock = engine(on, record)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(skinCommand('msn'))
  await $.turn.complete(turn(40_000, { answer: 'x'.repeat(200) }))
  await clock.advance(0)
  const popup = record.toasts.at(-1) ?? ''
  expect(popup.startsWith('Claude says: xxx')).toBe(true)
  expect(popup.endsWith('…')).toBe(true)
  expect(popup.length).toBe('Claude says: '.length + 80)
})

test('a state message in the spinner stays readable: no bubble, no dots of our own', async ($, on) => {
  const record = { played: [] as string[], toasts: [] as string[], statuses: [] as (string | undefined)[] }
  engine(on, record)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    const props = e.props as { word?: string; message?: string | null }

    return <Text>{props.message ?? props.word ?? ''}</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(skinCommand('imessage'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'retro-chat',
      surface,
      component: 'Spinner',
      requestId: 's1',
      props: { word: 'Sauteing', message: 'Compacting conversation', suffix: '…', mode: 'requesting' },
    })
    expect(await ui.find({ type: 'Text', text: /^Compacting conversation$/ })).toBeDefined()
    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).not.toContain('"alt":"Claude is typing"')
    expect(drawn).not.toContain('#8E8E93')
    await ui.unmount()
  }
})
