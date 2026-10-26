import type { Skin } from './shared'
import { clock12, date } from './shared'

// MSN's gray "says:" header over each message, the text indented beneath it.
const GRAY = '#808080'
// The buddy's green.
const GREEN = { light: '#00AF00', dark: '#5FD75F' }

export const msn: Skin = {
  id: 'msn',
  label: 'MSN Messenger',
  greetsOnStart: true,
  hello: () => 'Claude has just signed in.',
  spinner: 'Claude is typing a message',
  sounds: { signOn: 'sounds/msn-signin.wav', receive: 'sounds/msn-message.wav' },
  popup: { signOn: 'Claude has just signed in.', reply: line => `Claude says: ${line}` },
  // An antenna buddy waving its arms.
  sprite: {
    colour: GREEN,
    frames: [
      ['..X....X..', '...X..X...', '..XXXXXX..', '.XX.XX.XX.', '.XXXXXXXX.', 'X.XXXXXX.X', 'X..X..X..X', '...X..X...'],
      ['..X....X..', '...X..X...', 'X.XXXXXX.X', 'XXX.XX.XXX', '.XXXXXXXX.', '..XXXXXX..', '..X....X..', '.X......X.'],
    ],
  },

  user(ui, text, ctx) {
    const { Box, Text } = ui

    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={GRAY}>{ctx.name} says:</Text>
        <Box paddingLeft={2}>
          <Text>{text}</Text>
        </Box>
      </Box>
    )
  },

  assistant(ui, text, isFirst, ctx, drawn) {
    const { Box, Markdown, Text } = ui

    return (
      <Box flexDirection="column" marginTop={isFirst ? 1 : 0}>
        {isFirst && <Text color={GRAY}>Claude says:</Text>}
        <Box paddingLeft={2}>{drawn ?? <Markdown text={text} />}</Box>
      </Box>
    )
  },

  turnLine(ui, durationMs, ctx) {
    const { Text } = ui

    return (
      <Text color={GRAY}>
        Last message received on {date(ctx.at)} at {clock12(ctx.at)}.
      </Text>
    )
  },
}
