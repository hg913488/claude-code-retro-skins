# Make your own skin

A skin is one file in `skins/`. This guide adds a made-up skin called `icq` and uses the MSN skin (`skins/msn.tsx`) as the model.

## 1. Know the shape

The `Skin` type is in `skins/shared.ts`. Only six fields are required.

| Field | What it is |
|---|---|
| `id` | The word you type after `/skin`. Lowercase. |
| `label` | The skin's display name. |
| `user(ui, text, ctx)` | Draws your message. |
| `assistant(ui, text, isFirst, ctx, drawn)` | Draws Claude's reply, one block at a time. |
| `hello(ctx)` | The line the chat shows when the skin is switched on. |
| `greetsOnStart` | `true` if that line is also logged when a session starts. MSN, AIM and IRC do. iMessage does not. |

The rest are optional. Leave out what the skin doesn't have.

| Field | What it does |
|---|---|
| `spinner` | The word shown while Claude works. MSN uses `'Claude is typing a message'`. |
| `spinnerSuffix` | Replaces Claude Code's ellipsis after that word. iMessage sets `''`. |
| `spinnerColour` | Draws the spinner word in this colour. iMessage uses it. |
| `sprite` | The pixel buddy beside the spinner. See step 3. |
| `typingSvg(isDark)` | Desktop only. An animated SVG that replaces the spinner line. iMessage uses it. |
| `sounds` | `{ signOn, signOff, receive }`, each a path like `'sounds/msn-signin.wav'`. |
| `popup` | `{ signOn, reply }`. A toast on sign-on, and one with the reply's first line. `reply` is a function of that line. |
| `away` | Status-line messages shown while Claude works, taken in turn. AIM uses it. |
| `turnLine(ui, durationMs, ctx)` | The line that closes a turn. If absent, Claude Code's own line stays. |

## 2. Write the file

Create `skins/icq.tsx`. Start from `skins/msn.tsx`.

```tsx
import type { Skin } from './shared'
import { clock12, date } from './shared'

// MSN's gray "says:" header over each message, the text indented beneath it.
const GRAY = '#808080'

export const icq: Skin = {
  id: 'icq',
  label: 'ICQ',
  greetsOnStart: true,
  hello: () => 'Claude is online.',
  spinner: 'Claude is typing',

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
}
```

Things to copy from the existing skins:

- Take `Box`, `Text` and `Markdown` from the `ui` argument. Do not import them.
- `ctx` gives you `name` (the screen name setting), `at` (when the message was first drawn), `isDark`, `columns` and `folder` (the working folder's name, used by IRC's channel).
- Read `ctx.at` with the UTC getters. The helpers `clock12`, `clock24` and `date` in `shared.ts` already do.
- `isFirst` is true for the first block of a reply. MSN only prints "Claude says:" then. AIM and IRC print the name on every block.
- `drawn` is set when the reply holds a table or code block. Claude Code draws it, and the skin wraps it: `drawn ?? <Markdown text={text} />`.
- Pass `marginTop={1}` on your message and on the first block of a reply, as the existing skins do.

## 3. Colours

A colour is a hex string, or `{ light, dark }` picked with `ctx.isDark`. AIM does this:

```ts
const RED = { light: '#D70000', dark: '#FF5F5F' }
const look = ctx.isDark ? 'dark' : 'light'
// <Text color={RED[look]}>
```

MSN's gray is one value for both themes. Its green is a `{ light, dark }` pair. For a sprite, `colour` takes either form.

## 4. Sprite (optional)

`sprite` is `{ colour, frames }`. `frames` is two arrays of exactly 8 strings. `X` is a lit pixel and `.` is empty. The two frames swap to animate. MSN's buddy waves its arms:

```ts
sprite: {
  colour: GREEN,
  frames: [
    ['..X....X..', /* 6 more rows */ ],
    ['..X....X..', /* 6 more rows */ ],
  ],
},
```

Keep rows the same width within a skin. On the terminal the rows are drawn as half-blocks. On desktop they become square SVG pixels.

## 5. Sounds (optional)

Put the `.wav` in `sounds/` and name it in `sounds`:

```ts
sounds: { signOn: 'sounds/msn-signin.wav', receive: 'sounds/msn-message.wav' },
```

- `signOn` plays when the skin is switched on, and at session start.
- `signOff` plays when you switch away or the session ends. Only AIM has one.
- `receive` plays when Claude finishes a turn that took 30 seconds or more.

All sounds obey the user's Sounds setting. Use sounds you made or have the rights to.

## 6. Register it

Two edits.

In `types/index.d.ts`, add the id:

```ts
export type SkinId = 'off' | 'imessage' | 'msn' | 'aim' | 'irc' | 'icq'
```

In `hooks/register.tsx`, import the skin and add it to `SKINS`:

```ts
import { icq } from '../skins/icq'

const SKINS: Record<Exclude<SkinId, 'off'>, Skin> = { imessage, msn, aim, irc, icq }
```

`/skin` reads its list from `SKINS`, so the new id shows up there. The `/skin` command's description and `argumentHint` in `register.tsx` list the skins by hand. Add the id to both. So do the README and the `plugin.json` description.

## 7. Test it

`tests/skins.test.tsx` runs every skin on `terminal` and `desktop`. Add your skin to the `EXPECT` table, which says what your message and Claude's reply must show:

```ts
const EXPECT = {
  msn: { you: /^HG says:$/, claude: /^Claude says:$/ },
  // icq: { you: /^HG says:$/, claude: /^Claude says:$/ },
}
```

Then run the checks from the repo root:

```
claude plugin test .
npx -y -p typescript@5.6.3 tsc --noEmit -p .
claude plugin validate .
```

Some tests may list skins by hand, such as the sprite and sound tests. If one fails on your skin, read it and add your skin where it lists the others.

To try it by hand, install the repo as a plugin, run `/skin icq`, send a message, and ask for a table to check the `drawn` path.
