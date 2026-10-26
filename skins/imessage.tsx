import type { Skin } from './shared'
import { bubbleWidth } from './shared'

// iMessage blue, and the reply bubble's gray with its rounded edge, as 256-colour
// values a terminal draws exactly. Border cells take no fill, so the edge shows
// a thin gap inside it.
const BLUE = '#0A84FF'
const GRAY = { light: '#D0D0D0', dark: '#3A3A3A' }
const EDGE = { light: '#A8A8A8', dark: '#585858' }

export const imessage: Skin = {
  id: 'imessage',
  label: 'iMessage',
  greetsOnStart: false,
  hello: () => 'iMessage on. Your messages are blue now.',
  // The typing bubble's three dots, with no ellipsis after them.
  spinner: '•••',
  spinnerSuffix: '',
  spinnerColour: '#8E8E93',
  sounds: { receive: 'sounds/imessage-receive.wav' },
  // A speech bubble, the dots moving inside it.
  sprite: {
    colour: BLUE,
    frames: [
      ['.XXXXXXXXX.', 'XXXXXXXXXXX', 'XX.XX.XX.XX', 'XX.XX.XX.XX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '.XX........', 'X..........'],
      ['.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXXX.XX.XXX', 'XXXX.XX.XXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '.XX........', 'X..........'],
    ],
  },
  // Desktop: the real typing indicator, a gray bubble whose three dots pulse in turn.
  typingSvg: isDark => {
    const bubble = isDark ? '#3A3A3C' : '#E9E9EB'
    const dot = isDark ? '#98989D' : '#8E8E93'
    const dots = [18, 30, 42]
      .map(
        (cx, i) =>
          `<circle cx="${cx}" cy="17" r="4.5" fill="${dot}" opacity="0.4"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" begin="${i * 0.2}s" repeatCount="indefinite"/></circle>`,
      )
      .join('')

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="62" height="40" viewBox="0 0 62 40">` +
      `<circle cx="6" cy="34" r="4" fill="${bubble}"/><circle cx="2" cy="37" r="2" fill="${bubble}"/>` +
      `<rect x="4" y="0" width="56" height="34" rx="17" fill="${bubble}"/>${dots}</svg>`
    )
  },

  user(ui, text, ctx) {
    const { Box, Text } = ui

    return (
      <Box flexDirection="column" alignItems="flex-end" marginTop={1}>
        <Box backgroundColor={BLUE} borderStyle="round" borderColor={BLUE} paddingX={1} width={bubbleWidth(text, ctx.columns)}>
          <Text color="white">{text}</Text>
        </Box>
        <Text dimColor size="caption">
          Delivered
        </Text>
      </Box>
    )
  },

  // Every block of one reply joins the bubble above it: only the first gets the label and the gap.
  assistant(ui, text, isFirst, ctx, drawn) {
    const { Box, Markdown, Text } = ui
    const look = ctx.isDark ? 'dark' : 'light'

    return (
      <Box flexDirection="column" alignItems="flex-start" marginTop={isFirst ? 1 : 0}>
        {isFirst && (
          <Text dimColor size="caption">
            Claude
          </Text>
        )}
        {drawn ?? (
          <Box backgroundColor={GRAY[look]} borderStyle="round" borderColor={EDGE[look]} paddingX={1} width={bubbleWidth(text, ctx.columns)}>
            <Markdown text={text} />
          </Box>
        )}
      </Box>
    )
  },
}
