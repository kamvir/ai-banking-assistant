# AI Banking Assistant — Build Plan

## For Claude Code

This plan is written to be handed directly to Claude Code. Work through it phase by phase — don't ask for the whole project in one go, so each phase is reviewable and produces its own commit(s).

Suggested prompts, one per phase:

1. **Phase 0:** "Read BUILD_PLAN.md. Set up the monorepo using the structure in the 'Repo Structure' section, initialize the Ionic Angular app and NestJS backend, and configure ESLint/Prettier and a basic CI workflow. Stop after Phase 0 — don't start Phase 1 yet."
2. **Phase 1:** "Now do Phase 1 from BUILD_PLAN.md: build the chat UI shell and the `/chat` endpoint that proxies to OpenAI with streaming responses. Deploy it if deployment isn't set up yet."
3. **Phase 2:** "Now do Phase 2: set up Pinecone ingestion for sample FAQ/policy docs and wire retrieval-augmented answers into the chat endpoint, including the low-confidence escalation fallback."
4. **Phase 3:** "Now do Phase 3: build the loan eligibility rules engine as a standalone, unit-tested module first, then expose it as a LangChain tool and wire the onboarding flow in the UI."
5. **Phase 4:** "Now do Phase 4: build the product catalog, embed it in Pinecone with metadata, and wire personalized recommendations using profile data."
6. **Phase 5:** "Now do Phase 5: add multilingual support — i18n for static UI strings and language detection/response instructions for the chat."
7. **Phase 6:** "Now do Phase 6: add rate limiting and mock auth, write docs/architecture.md, add tests for the rules engine and a RAG integration test, and draft the README."

Give it your OpenAI and Pinecone API keys via `.env` (never ask it to hardcode them), and review each phase's diff before moving to the next.

## Overview

An AI-powered banking assistant with four core features: Loan Eligibility Advisor, Customer Query Resolution (RAG), Personalized Product Recommendations, and Multilingual Support. Built as a cross-platform app (web + iOS + Android) using Ionic/Angular, with a NestJS backend orchestrating OpenAI and Pinecone via LangChain.

## Architecture

```
Ionic/Angular (Web + iOS + Android)
        |  REST / WebSocket
NestJS Backend API
   - Auth, session mgmt, rate limiting
   - LangChain orchestration (chains + tools/agents)
        |
   +----+--------------+--------------+
   |                   |              |
OpenAI API        Pinecone         Rules Engine
(chat + embed)   (vector store)    (loan eligibility,
                 FAQ/product docs   deterministic)
```

**Key principle:** the client never talks to OpenAI or Pinecone directly. All LLM/vector calls go through the backend to protect API keys and allow rate limiting, logging, and guardrails.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Ionic + Angular (standalone components) |
| State | Angular Signals (NgRx if it grows) |
| Backend | NestJS (TypeScript) |
| LLM orchestration | LangChain.js |
| Vector DB | Pinecone (serverless index) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Auth | Firebase Auth or Auth0 |
| Deployment | Frontend: Vercel/Netlify. Backend: Render/Railway |

## Repo Structure

```
ai-banking-assistant/
├── apps/
│   ├── mobile-web/          # Ionic Angular app
│   └── api/                 # NestJS backend
├── packages/
│   └── shared-types/        # shared DTOs/interfaces
├── docs/
│   ├── architecture.md
│   └── demo.gif
├── .github/workflows/       # CI: lint, test, build
└── README.md
```

## Phased Build Plan

### Phase 0 — Setup & Scaffolding
- Monorepo (Nx or npm workspaces) with `apps/mobile-web` and `apps/api`.
- ESLint/Prettier, basic CI (lint + build on push).
- OpenAI + Pinecone API keys in `.env`; commit `.env.example` only.
- Deploy a "hello world" of both apps early to prove the pipeline.

### Phase 1 — Core Chat Plumbing
- Chat UI shell in Ionic: message list, input, typing indicator, responsive layout.
- `/chat` endpoint proxying to OpenAI with a system prompt, no LangChain/Pinecone yet.
- Streaming responses (SSE or WebSocket).
- **Milestone:** deployed, working generic chatbot.

### Phase 2 — Customer Query Resolution (RAG)
- Write 10–20 sample FAQ/policy docs (accounts, fees, KYC, loan basics).
- Ingestion script: chunk (`RecursiveCharacterTextSplitter`), embed, upsert to Pinecone with metadata.
- Wire retrieval into chat (`RetrievalQAChain` or custom prompt + context injection).
- Fallback: low similarity → escalate to "human agent" rather than hallucinate.
- **Milestone:** grounded answers with visible source citation in the UI.

### Phase 3 — Loan Eligibility Advisor
- Standalone, unit-testable rules engine: `calculateEligibility(profile): EligibilityResult`.
- Onboarding flow to collect income, employment, existing debt, credit score.
- Expose as a LangChain tool (function calling); LLM explains results and answers "why" using structured reasons, never invents numbers.
- **Milestone:** full conversation from questions asked → eligibility verdict → plain-language explanation.

### Phase 4 — Personalized Product Recommendations
- Small product catalog (5–10 fictional products) embedded in Pinecone with metadata filters.
- Filter/rank via `SelfQueryRetriever` or manual metadata filtering using profile data; LLM writes the pitch.
- **Milestone:** relevant, reasoned product recommendations, not generic copy.

### Phase 5 — Multilingual Support
- Static UI: `@ngx-translate` or Angular i18n, 2–3 languages.
- Dynamic chat: detect language, instruct system prompt to respond in kind.
- **Milestone:** full feature set usable end-to-end in a non-English language.

### Phase 6 — Portfolio Polish
- Rate limiting + basic/mock auth.
- `docs/architecture.md` with diagram and 3–5 trade-off write-ups.
- 60–90 second demo GIF/video covering all four features.
- Unit tests for the rules engine, one RAG integration test, green CI badge.
- README: problem statement → architecture diagram → tech stack → features with GIFs → responsible-AI disclaimer → local setup.

## Suggested Pacing (part-time)
- Phase 0–1: one weekend
- Phase 2: a few days
- Phase 3: a few days (most involved)
- Phase 4: 1–2 days
- Phase 5: 1–2 days
- Phase 6: ongoing, with a dedicated final day for README/demo

## Responsible AI Notes (include in README)
- This is a demo/portfolio project — no real loan decisions or PII should be processed.
- Eligibility results come from a deterministic rules engine, not the LLM, to avoid hallucinated financial advice.
- Low-confidence RAG answers escalate rather than guess.
- Rate limiting and logging in place to prevent abuse of the OpenAI API key.
