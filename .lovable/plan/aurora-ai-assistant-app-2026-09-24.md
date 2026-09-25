# Aurora — AI assistant app

An all-in-one AI chatbot with a striking animated gradient intro, onboarding, sign-in, a ChatGPT-style chat, and real tool access to your apps (Google Calendar, Gmail, etc.) via Composio.

## What gets built

### 1. Landing (signed-out)
- Full-screen animated gradient background (your `animated-gradient-background` component, copied as-is into the UI components folder).
- "Meet Aurora" headline + rounded "Next" button.
- Second beat: "Aurora is an all-in-one chatbot that helps you manage your calendar, email and much more…"
- Animated text reveal using the smoothui blur/shine/soft-blur components.

### 2. Onboarding
- 3–4 step walkthrough over the same gradient (what Aurora does, connect your apps, memory & personalization, ready).
- Progress dots, Back/Next, Skip. Finishing lands on sign-in.

### 3. Accounts
- Sign in / create account with Google (using the Google credentials you saved) and with email + password.
- Apple sign-in: not included — it needs a paid Apple Developer account and an Apple-issued key. Can be added later once you have those.
- I will give you the exact redirect URL to paste into your Google Cloud console once the backend is provisioned.

### 4. Chat (signed-in) — ChatGPT-like
- Conversation list sidebar, new chat, rename/delete, persisted history.
- Streaming assistant replies with day separators, message actions (copy/regenerate/edit), branch switching, reasoning/sources/citations display, loader states — built from the assistant-ui and smoothui elements you listed.
- Composer with attachments, `/` slash commands and `@plugin` mentions (e.g. `@google-calendar`).
- Image generation in-chat.
- Tool calls rendered as visible cards (tool name, status, collapsible input, formatted output; web search gets its own card).

### 5. Plugins (Composio)
- Connect integrations from a Plugins page; each connection is per user.
- Aurora can call those tools during chat (create events, read/send mail, etc.).
- First run: connect one integration and make a real tool call end-to-end, then I show you what happened.

### 6. Settings
- Profile, custom instructions/personalization, memory (facts Aurora remembers, editable/deletable), plugin management, usage quota banner.

## Technical notes

- **Backend**: Lovable Cloud (Postgres + auth + storage). Tables: `profiles`, `conversations`, `messages`, `memories`, `user_settings`, `plugin_connections` — all with row-level security so each user only sees their own rows.
- **Models**: chat runs on `openai/gpt-5.6-sol` as you asked (cheaper than the default). Jev (`typesafe/jev-latest`) handles the cheap typed decisions — routing a message to tools vs. plain chat, plugin intent detection, memory-worthiness classification — so the expensive model runs less often. Images via the gateway image model.
- **Composio**: the API key you pasted in chat gets stored in the encrypted secret store, not in code. All Composio calls happen server-side.
- **Component sources**: `framer-motion`, `@lottiefiles/dotlottie-react`, the assistant-ui elements and the smoothui AI elements get installed from their registries.
- **Design system**: dark, gradient-led tokens defined centrally in the stylesheet; no hardcoded colors in components.

## Sequence

1. Enable Cloud, create schema + RLS, turn on email and Google sign-in.
2. Install dependencies and registry components; add gradient component + design tokens.
3. Landing → onboarding → auth flow.
4. Chat backend (streaming, history, memory, image gen) + chat UI.
5. Composio plugins page, `@plugin` mentions, tool-call cards; verify one real tool call.
6. Settings, quota banner, polish; hand you the Google redirect URL.

## Note on the key you pasted

The Composio API key was posted in plain chat, so treat it as exposed — rotate it in Composio after we're set up, and give me the new one through the secure secret form.
