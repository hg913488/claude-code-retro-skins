import type { Skin } from './shared'
import { clock24, duration } from './shared'

// mIRC-style nick colours: you in green, Claude in its orange.
const YOU = { light: '#00AF00', dark: '#5FD75F' }
const CLAUDE = { light: '#D75F00', dark: '#FF8700' }

export const irc: Skin = {
  id: 'irc',
  label: 'IRC',
  greetsOnStart: true,
  hello: ctx => `* Claude has joined #${ctx.folder || 'claude'}`,
  spinner: '* Claude is typing',
  // An invader, legs shuffling.
  sprite: {
    colour: CLAUDE,
    frames: [
      ['...X..X...', '..XXXXXX..', '.XX.XX.XX.', 'XXXXXXXXXX', '.X.XXXX.X.', 'X........X', '.X......X.', '..........'],
      ['...X..X...', '..XXXXXX..', '.XX.XX.XX.', 'XXXXXXXXXX', '..XXXXXX..', '.X.X..X.X.', 'X........X', '..........'],
    ],
  },

  user(ui, text, ctx) {
    const { Box, Text } = ui
    const look = ctx.isDark ? 'dark' : 'light'

    return (
      <Box flexDirection="row" marginTop={1}>
        <Box flexShrink={0}>
          <Text>
            <Text dimColor>[{clock24(ctx.at)}] </Text>
            {'<'}
            <Text color={YOU[look]} bold>
              {ctx.name}
            </Text>
            {'> '}
          </Text>
        </Box>
        <Box flexShrink={1}>
          <Text>{text}</Text>
        </Box>
      </Box>
    )
  },

  assistant(ui, text, isFirst, ctx, drawn) {
    const { Box, Markdown, Text } = ui
    const look = ctx.isDark ? 'dark' : 'light'
    const nick = (
      <Text>
        <Text dimColor>[{clock24(ctx.at)}] </Text>
        {'<'}
        <Text color={CLAUDE[look]} bold>
          Claude
        </Text>
        {'> '}
      </Text>
    )

    if (drawn) {
      return (
        <Box flexDirection="column" marginTop={isFirst ? 1 : 0}>
          {nick}
          {drawn}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" marginTop={isFirst ? 1 : 0}>
        <Box flexShrink={0}>{nick}</Box>
        <Box flexShrink={1}>
          <Markdown text={text} />
        </Box>
      </Box>
    )
  },

  turnLine(ui, durationMs) {
    const { Text } = ui

    return <Text dimColor>-!- Claude was busy for {duration(durationMs)}</Text>
  },
}
