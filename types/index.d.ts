export type SkinId = 'off' | 'imessage' | 'msn' | 'aim' | 'irc'

declare module 'claude-code' {
  interface PluginState {
    'retro-chat': { skin: SkinId }
  }
}
