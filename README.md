# Pact

The negotiation desk any business can turn on.

**Idea status:** LOCKED — see [docs/LOCKED.md](docs/LOCKED.md).

**Repository:** https://cursor.com/codebase/ayaan2907/guava-voice-hackathon (private; change visibility in settings on that page)

Pact is a **multi-tenant** inbound + outbound voice desk. A company signs up, we load their playbook, documents, and authority, and they get:

- a **public web line** (`/line/[slug]`) for anyone who calls that business from the site
- an **operator console** (`/desk/[slug]`) that watches the live call, fills structured fields, and **whispers** instructions without taking the audio
- an **outbound queue** for renewals, lapses, follow-ups

Insurance (Northstar Mutual) is the live demo vertical. Logistics (Harbor Lane Freight) is a second tenant in the same app. Healthcare and e-commerce are templates on signup.

This is not a single voice agent. It is the platform you would put in front of the next business.

## Clone

```bash
# Install the Origin CLI
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh

# Sign in (also sets up git credentials)
origin auth login

# Clone the repository
origin repo clone ayaan2907/guava-voice-hackathon
```

If `origin` is not found after install, persist `~/.local/bin` on PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Origin CLI docs: https://cursor.com/docs/origin/cli

## Run locally

```bash
npm install
npm run dev
# → http://127.0.0.1:43147
```

In another terminal, after you have a Guava key and WebRTC codes:

```bash
export GUAVA_API_KEY=...
export PACT_URL=http://127.0.0.1:43147
pip install -r expert/requirements.txt
python expert/main.py
```

Paste `grtc-…` codes into each tenant's **Line** tab. Until then, the desk runs a built-in simulator so you can demo whisper, fields, bilingual gloss, and outbound without a key.

## Demo path

1. Open the homepage, then **Open Northstar**.
2. In another window, open **public line** and talk (or click Simulate inbound on the desk).
3. When the caller asks for a manager, type a whisper — the agent stays on the call.
4. Place an outbound call to Maria (renewal) or Priya (Spanish).
5. **Start a desk** and sign up a clinic. Same product, new tenant.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui — control plane and UI
- In-memory tenant/session store (JSON on disk for tenants)
- Python Expert (`guava-sdk`) — Dialog System steering via documented APIs only
- Guava WebRTC widget for real inbound audio when a `grtc-` code is set

## Guava mapping

See [docs/pact-design.md](docs/pact-design.md) and `/platform` in the app.

Honest constraints: no 3-way audio (`transfer()` leaves the agent), Conversations API is post-call, outbound phone/SMS need approval, widget does not resume across remounts.

## Event

Built for Guava Voice AI Hackathon Build Night SF · 29 Aug 2026 · House of AI.
