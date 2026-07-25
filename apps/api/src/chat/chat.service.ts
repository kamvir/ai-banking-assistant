import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatMessageDto } from './dto/chat-request.dto';

const SYSTEM_PROMPT = `You are a helpful assistant for a retail bank's customer-facing app.
Answer clearly and concisely. This is a demo/portfolio project — do not claim to access
real account data, and do not give personalized financial or investment advice. If asked
something outside general banking questions, say so plainly.`;

@Injectable()
export class ChatService {
  private openai?: OpenAI;

  constructor(private readonly config: ConfigService) {}

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

  async *streamReply(messages: ChatMessageDto[]): AsyncGenerator<string> {
    const stream = await this.getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    });

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}
