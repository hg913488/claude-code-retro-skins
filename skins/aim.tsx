import type { Skin } from './shared'
import { clock12 } from './shared'

// AIM: your screen name in red, your buddy's in blue, each with the time.
const RED = { light: '#D70000', dark: '#FF5F5F' }
const BLUE = { light: '#0000D7', dark: '#5F87FF' }

export const aim: Skin = {
  id: 'aim',
  label: 'AIM',
  greetsOnStart: true,
  hello: ctx => `*** Claude signed on at ${clock12(ctx.at, true)}.`,
  spinner: 'Claude is typing',
  sounds: { signOn: 'sounds/aim-door-open.wav', signOff: 'sounds/aim-door-close.wav', receive: 'sounds/aim-im.wav' },
  away: ['brb, writing code', 'out to lunch... for your bugs', '~*~ compiling ~*~', 'be back l8r'],
  // A running buddy, arms and legs swinging.
  sprite: {
    colour: BLUE,
    frames: [
      ['...XX....', '...XX....', '..XXXX...', '.X.XX.X..', '...XX....', '..X..X...', '.X....X..', 'X......X.'],
      ['...XX....', '...XX....', '.XXXXX...', 'X..XX..X.', '...XX....', '...XX....', '..X..X...', '..X..X...'],
    ],
  },

  user(ui, text, ctx) {
    const { Box, Text } = ui
    const look = ctx.isDark ? 'dark' : 'light'

    return (
      <Box flexDirection="row" marginTop={1}>
        <Box flexShrink={0}>
          <Text color={RED[look]}>
            <Text bold>{ctx.name}</Text> ({clock12(ctx.at, true)}):{' '}
          </Text>
        </Box>
        <Box flexShrink={1}>
          <Text>{text}</Text>
        </Box>
      </Box>
    )
  },

  // Each block is its own IM, so each gets the screen name.
  assistant(ui, text, isFirst, ctx, drawn) {
    const { Box, Markdown, Text } = ui
    const look = ctx.isDark ? 'dark' : 'light'
    const name = (
      <Text color={BLUE[look]}>
        <Text bold>Claude</Text> ({clock12(ctx.at, true)}):{' '}
      </Text>
    )

    if (drawn) {
      return (
        <Box flexDirection="column" marginTop={isFirst ? 1 : 0}>
          {name}
          {drawn}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" marginTop={isFirst ? 1 : 0}>
        <Box flexShrink={0}>{name}</Box>
        <Box flexShrink={1}>
          <Markdown text={text} />
        </Box>
      </Box>
    )
  },
}
