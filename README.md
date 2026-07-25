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

### Knowledge base (RAG)

Customer query resolution is grounded in a small FAQ/policy knowledge base
(`apps/api/src/rag/knowledge/*.md` — accounts, fees, KYC, loan basics) embedded into Pinecone.
Before the chat can answer from it, run the ingestion script once (and again any time the docs
change):

```bash
npm run ingest --workspace=api
```

This chunks each doc, embeds it with `text-embedding-3-small`, and upserts it into your Pinecone
index — creating the index automatically as a serverless index if it doesn't exist yet. Requires
`OPENAI_API_KEY`, `PINECONE_API_KEY`, and `PINECONE_INDEX_NAME` to be set in `apps/api/.env`.

If a question's best-matching context falls below `RAG_CONFIDENCE_THRESHOLD` (default `0.5`),
the assistant escalates to a "contact a human agent" message instead of guessing.

## Scripts (root)

- `npm run lint` — lint both apps
- `npm run build` — build both apps
- `npm run test` — run api tests

## Scripts (api workspace)

- `npm run ingest --workspace=api` — chunk, embed, and upsert the knowledge base into Pinecone

## Deployment

Config is checked in but no live deployment is connected yet — connect your own accounts to activate:

- **Frontend** (`apps/mobile-web/vercel.json`): create a Vercel project from this repo with **Root Directory** set to `apps/mobile-web`. Vercel auto-detects the npm workspace and runs the build from there.
- **Backend** (`render.yaml`): create a Render Blueprint from this repo (Render reads `render.yaml` from the repo root). Set `OPENAI_API_KEY`, `PINECONE_API_KEY`, and `PINECONE_INDEX_NAME` in the Render dashboard — they're marked `sync: false` so they're never stored in the repo.
