import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RagService, RetrievedChunk } from '../rag/rag.service';
import { ChatSource, ChatStreamEvent } from './chat-event';
import { ChatMessageDto } from './dto/chat-request.dto';

// Calibrated empirically against our OpenAI text-embedding-3-small + Pinecone cosine setup.
// Specific questions score ~0.64-0.70; broad-but-legitimate ones ("tell me about accounts")
// score lower, ~0.42-0.49, since they're less semantically specific than any single chunk.
// Off-topic queries stay ~0.08-0.15 regardless of phrasing. 0.35 sits clear of both.
const DEFAULT_CONFIDENCE_THRESHOLD = 0.35;
const RETRIEVAL_K = 4;

const ESCALATION_MESSAGE =
  "I don't have enough verified information to answer that confidently, and I'd rather " +
  'connect you with a human agent than guess. Please reach out to support@ourbank.example ' +
  'or call our helpline, and they can help from here.';

const GREETING_RESPONSE =
  'Hi there! I can help with questions about accounts, fees, KYC, and loans — what would you ' +
  'like to know?';

// Deliberately narrow and deterministic: small talk gets a canned, zero-risk reply with no LLM
// call, so it never competes with the "never hallucinate a banking fact" guarantee below. A
// message that doesn't match one of these still goes through retrieval + escalation as normal.
const SMALL_TALK_PATTERNS = [
  /^(hi|hello|hey|yo|howdy)[\s!.,]*$/i,
  /^good\s*(morning|afternoon|evening)[\s!.,]*$/i,
  /^(how are you|how's it going|what's up)[\s?!.,]*$/i,
  /^(thanks|thank you|thx)[\s!.,]*$/i,
  /^(bye|goodbye|see ya)[\s!.,]*$/i,
  /^(what can you (do|help with)\??|who are you\??|what are you\??)$/i,
];

function isSmallTalk(message: string): boolean {
  const trimmed = message.trim();
  return SMALL_TALK_PATTERNS.some((pattern) => pattern.test(trimmed));
}

const SYSTEM_PROMPT = `You are a helpful assistant for a retail bank's customer-facing app.
Answer the customer's question using ONLY the context provided below — do not use outside
knowledge, and never invent numbers, fees, or policies that aren't in the context. If the
context doesn't fully answer the question, say plainly what you don't know rather than
guessing. This is a demo/portfolio project — do not claim to access real account data, and do
not give personalized financial or investment advice.`;

@Injectable()
export class ChatService {
  private openai?: OpenAI;
  private readonly confidenceThreshold: number;

  constructor(
    private readonly config: ConfigService,
    private readonly rag: RagService,
  ) {
    const configured = Number(this.config.get<string>('RAG_CONFIDENCE_THRESHOLD'));
    this.confidenceThreshold =
      Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CONFIDENCE_THRESHOLD;
  }

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured.');
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  async *streamReply(messages: ChatMessageDto[]): AsyncGenerator<ChatStreamEvent> {
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!latestUserMessage) {
      yield { type: 'escalate', message: ESCALATION_MESSAGE };
      return;
    }

    if (isSmallTalk(latestUserMessage.content)) {
      yield { type: 'content', content: GREETING_RESPONSE };
      return;
    }

    const chunks = await this.rag.retrieve(latestUserMessage.content, RETRIEVAL_K);
    const topScore = chunks[0]?.score ?? 0;

    if (chunks.length === 0 || topScore < this.confidenceThreshold) {
      yield { type: 'escalate', message: ESCALATION_MESSAGE };
      return;
    }

    yield { type: 'sources', sources: dedupeSources(chunks) };

    const context = chunks
      .map((chunk, i) => `[${i + 1}] (${chunk.title})\n${chunk.content}`)
      .join('\n\n');

    const stream = await this.getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `Context:\n${context}` },
        ...messages,
      ],
    });

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) {
        yield { type: 'content', content: delta };
      }
    }
  }
}

function dedupeSources(chunks: RetrievedChunk[]): ChatSource[] {
  const seen = new Map<string, ChatSource>();
  for (const chunk of chunks) {
    if (!seen.has(chunk.source)) {
      seen.set(chunk.source, { title: chunk.title, category: chunk.category });
    }
  }
  return [...seen.values()];
}
