# AI Banking Assistant

AI-powered banking assistant demo: chat-based query resolution (RAG), loan eligibility advisor, personalized product recommendations, and multilingual support. Ionic/Angular frontend, NestJS backend orchestrating OpenAI and Pinecone via LangChain.

See [BUILD_PLAN.md](./BUILD_PLAN.md) for the phased build plan and architecture. (Full README with problem statement, architecture diagram, and demo GIF lands in Phase 6.)

## Repo structure

```
apps/
  mobile-web/   # Ionic Angular app
  api/          # NestJS backend
packages/
  shared-types/ # shared DTOs/interfaces
docs/
```

## Local setup

```bash
npm install
cp .env.example apps/api/.env   # fill in OPENAI_API_KEY / PINECONE_API_KEY

npm run start:api   # NestJS on :3000
npm run start:web   # Ionic dev server
```

Requires Node >= 20.19.

## Scripts (root)

- `npm run lint` — lint both apps
- `npm run build` — build both apps
- `npm run test` — run api tests

## Deployment

Config is checked in but no live deployment is connected yet — connect your own accounts to activate:

- **Frontend** (`apps/mobile-web/vercel.json`): create a Vercel project from this repo with **Root Directory** set to `apps/mobile-web`. Vercel auto-detects the npm workspace and runs the build from there.
- **Backend** (`render.yaml`): create a Render Blueprint from this repo (Render reads `render.yaml` from the repo root). Set `OPENAI_API_KEY`, `PINECONE_API_KEY`, and `PINECONE_INDEX_NAME` in the Render dashboard — they're marked `sync: false` so they're never stored in the repo.
