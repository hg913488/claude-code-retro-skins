# AGENTS.md

Guide for coding agents working in this repo.

## What this is

Retro Chat (install name `retro-chat`) is a Claude Code plugin ("mod") that skins the chat as iMessage, MSN Messenger, AIM or IRC. `/skin <id>` switches, `/skin off` restores the usual look. It only changes how the chat is drawn. It does not touch prompts or answers.

## Layout

- `.claude-plugin/plugin.json`: name, version, and the `userConfig` settings (`name`, `sounds`).
- `.claude-plugin/marketplace.json`: lets the repo act as its own marketplace.
- `.claude-plugin/types/`: type stubs for the `claude-code` module. Used by `tsconfig.json`.
- `hooks/hooks.json`: loads `./register.tsx` as a module.
- `hooks/register.tsx`: all the behaviour. The skin registry, the `/skin` command, sounds, popups, the away message, and the render hooks for `UserMessage`, `AssistantMessage`, `Spinner` and `TurnDuration`.
- `hooks/sprite.tsx`: the terminal spinner sprite, a client module that swaps frames every 400 ms.
- `skins/shared.ts`: the `Skin` and `Ctx` types, and helpers (`bubbleWidth`, `halfBlocks`, `spriteSvg`, `isWide`, `clock24`, `clock12`, `date`, `duration`).
- `skins/<id>.tsx`: one file per skin: `imessage`, `msn`, `aim`, `irc`.
- `sounds/`: the `.wav` clips, referenced from skins as `sounds/<file>.wav`.
- `types/index.d.ts`: the `SkinId` union and the `retro-chat` plugin state.
- `tests/skins.test.tsx`: the test suite.
- `docs/make-a-skin.md`: how to add a skin.
- `assets/`: images for the README and social preview.

## How a skin is defined

A skin is an exported `Skin` object (see `skins/shared.ts`). Required: `id`, `label`, `user`, `assistant`, `hello`, `greetsOnStart`. Optional: `spinner`, `spinnerSuffix`, `spinnerColour`, `sounds`, `popup`, `away`, `sprite`, `typingSvg`, `turnLine`. To register one, import it in `hooks/register.tsx`, add it to `SKINS`, and add its id to `SkinId` in `types/index.d.ts`. Full steps are in `docs/make-a-skin.md`.

## Checks

Run from the repo root. All three must pass before you finish.

```
claude plugin test .
npx -y -p typescript@5.6.3 tsc --noEmit -p .
claude plugin validate .
```

`plugin test` should report all tests passing. `tsc` should print nothing.

## Conventions

- Skins draw with the elements from `ui` (`Box`, `Text`, `Markdown`), taken from the first argument. Do not import UI primitives.
- Colours are a hex string, or `{ light, dark }` and picked with `ctx.isDark`.
- Times come from `ctx.at`. Read it with the UTC getters (`clock12`, `clock24`, `date`), because it is already shifted to local time.
- Wide replies (a table or code block) arrive as `drawn`. A skin wraps it and does not restyle it.
- A skin that has no sounds, popup or turn line leaves those fields out.
- Code style: TypeScript, no semicolons, single quotes, 2-space indent, trailing commas, a short comment above each non-obvious thing.
- Tests use `test` and `mock` from `claude-code/testing` and run each skin on `terminal` and `desktop`.

## Do not

- Do not add a setting, command or feature the user did not ask for. Settings live in `plugin.json` `userConfig`.
- Do not change what Claude sees or says. This mod is display only.
- Do not make sounds block the chat. `play` in `hooks/register.tsx` ignores clips that fail.
- Do not add real Microsoft, AOL, Apple or Yahoo sound files or logos. The sounds here are original.
- Do not hardcode a user name. It comes from the `name` setting.
- Do not commit secrets or machine paths.
