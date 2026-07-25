import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { ChatMessage } from './chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly messages = signal<ChatMessage[]>([]);
  readonly isStreaming = signal(false);

  async sendMessage(content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed || this.isStreaming()) {
      return;
    }

    const history = this.messages().map(({ role, content }) => ({ role, content }));
    this.messages.update((msgs) => [...msgs, { role: 'user', content: trimmed }, { role: 'assistant', content: '' }]);
    this.isStreaming.set(true);

    try {
      const response = await fetch(`${environment.apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: trimmed }] }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          this.handleEvent(event);
        }
      }
    } catch {
      this.appendToLastMessage('\n\n⚠️ Something went wrong reaching the assistant. Please try again.');
    } finally {
      this.isStreaming.set(false);
    }
  }

  private handleEvent(event: string): void {
    const line = event.trim();
    if (!line.startsWith('data:')) {
      return;
    }

    const data = line.slice('data:'.length).trim();
    if (data === '[DONE]') {
      return;
    }

    const parsed = JSON.parse(data) as { content?: string; error?: string };
    if (parsed.error) {
      this.appendToLastMessage(`\n\n⚠️ ${parsed.error}`);
    } else if (parsed.content) {
      this.appendToLastMessage(parsed.content);
    }
  }

  private appendToLastMessage(chunk: string): void {
    this.messages.update((msgs) => {
      const updated = [...msgs];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = { ...last, content: last.content + chunk };
      return updated;
    });
  }
}
