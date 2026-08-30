# Pact

The negotiation desk any business can turn on.

**Idea status:** LOCKED — see [docs/LOCKED.md](docs/LOCKED.md).

**Repository:** https://cursor.com/codebase/ayaan2907/guava-voice-hackathon (private; change visibility in settings on that page)

Pact is a **multi-tenant** inbound + outbound voice desk. A company signs up, we load their playbook, documents, and authority, and they get:

- a **public web line** (`/line/[slug]`) for anyone who calls that business from the site
- an **operator dashboard** (`/app/[slug]`) that watches the live call, fills structured fields, and **whispers** without taking the audio
- a **platform monitor** (`/desks`) for every tenant's line, calls, and Guava playbook
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
cp .env.example .env   # then set GUAVA_API_KEY
docker compose up -d
npm install
npm run dev
# → http://127.0.0.1:43147
```

In another terminal:

```bash
source .venv/bin/activate
pip install -r expert/requirements.txt
python expert/main.py
```

The Expert mints a `grtc-` code per tenant and listens. Open `/line/[slug]` and use the Guava orb. There is no simulated transcript.

## Demo path

1. Homepage → Open Northstar desk, or sign up a business and save the playbook form.
2. Open **public line** (or the CRM orb) and talk.
3. When the caller asks for a manager, whisper from the desk. Agent stays on the call.
4. Switch tenant to Harbor Lane. Same product, different row in Postgres.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui — control plane and UI
- PostgreSQL (Docker) for tenants, users, and call logs
- Python Expert (`guava-sdk`) — Dialog System steering via documented APIs only
- Guava WebRTC widget for live inbound audio

## Guava mapping

See [docs/pact-design.md](docs/pact-design.md) and `/platform` in the app.

Honest constraints: no 3-way audio (`transfer()` leaves the agent), Conversations API is post-call, outbound phone/SMS need approval, widget does not resume across remounts.

## Event

Built for Guava Voice AI Hackathon Build Night SF · 29 Aug 2026 · House of AI.
