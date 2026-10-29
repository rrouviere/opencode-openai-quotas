# OpenAI subscription quotas for OpenCode

An OpenCode v2 plugin that displays your ChatGPT subscription's Codex quotas in the session sidebar. The five-hour and weekly panels show remaining quota, reset countdowns, and an estimated spending pace.

- Full-width bars show remaining quota. Blue indicates slower spending, green is on the linear goal, and red indicates faster spending.
- **Current Pace** estimates time to exhaustion based on the average usage rate during the current window. It requests blinking when exhaustion is projected before 90% of the window has elapsed; terminal support varies.
- The goal is the percentage that would remain if usage were spread evenly across the window. It is guidance, not a separate quota.

## Requirements

- OpenCode v2 (developed with 2.2.1)
- [Bun](https://bun.sh/) to install dependencies
- An OpenAI connection in OpenCode authenticated with a ChatGPT subscription, not an API key

## Installation

1. Clone or download this repository and open its directory in a terminal. If downloading an archive, extract it first.
2. Install dependencies:

   ```sh
   bun install
   ```

3. Add the **absolute path** of the extracted or cloned directory to the `plugins` array in `~/.config/opencode/opencode.json` for global installation, or in your project's `opencode.json` for that project. Preserve your existing settings and plugin entries:

   ```jsonc
   {
     "plugins": ["/absolute/path/to/opencode-openai-quota"]
   }
   ```

4. Restart OpenCode or use `/reload`, then open a session with the sidebar visible. Sign in to OpenCode's OpenAI integration with your ChatGPT subscription if you haven't already.

Keep the cloned directory in place: OpenCode loads the plugin from that path. To update it, pull the latest changes in that directory, run `bun install`, and reload OpenCode.

## Reading the display

`>reset` means the current pace projects exhaustion after the reset. `—` means there is insufficient information to estimate a pace. Actual usage rates can change, so estimates are not guarantees. Missing quota windows appear as unavailable. Narrow panels may shorten or truncate text to keep rows aligned.

## Privacy and limitations

The server plugin resolves the active OpenAI OAuth connection and requests `https://chatgpt.com/backend-api/wham/usage` every 60 seconds while the TUI is running. Tokens are not stored or logged by the plugin; only quota data is sent to the TUI. Requests reject redirects. With a remote OpenCode server, the login and request are on the server, and quota data travels to the connected client.

The Codex usage endpoint is undocumented and may change. Some plans may return only one window or different window lengths. The plugin does not independently refresh OAuth tokens; an expired or rejected login must be refreshed by OpenCode or by signing in again. Failed requests retain the last snapshot and mark it stale. Live subscription retrieval and terminal rendering have not been verified for every account or terminal.

## Development

```sh
bun install
bun test
bun run typecheck
```

The tests do not require a live account.
