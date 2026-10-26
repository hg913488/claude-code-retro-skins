import type { ClientModule } from 'claude-code'

// The spinner's sprite: two frames of half-block rows, swapped every 400 ms,
// stepping one column right each time and back after six.
type Props = { frames: [string[], string[]]; colour: string }
type State = { tick: number }

const Sprite: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  if (surface.state === undefined) {
    surface.setState({ tick: 0 })
    surface.every(400, () => surface.setState({ tick: (surface.state?.tick ?? 0) + 1 }))
  }
  const tick = surface.state?.tick ?? 0
  const rows = tick % 2 === 0 ? props.frames[0] : props.frames[1]

  return (
    <Box flexDirection="column" paddingLeft={tick % 6}>
      {rows.map((row, i) => (
        <Text key={String(i)} color={props.colour}>
          {row}
        </Text>
      ))}
    </Box>
  )
}

export default Sprite
