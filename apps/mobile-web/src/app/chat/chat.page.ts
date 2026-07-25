import { Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ChatService } from './chat.service';

const SUGGESTED_QUESTIONS = [
  'What happens if I overdraft my checking account?',
  'How do I open a savings account?',
  'What documents do I need for KYC?',
  'What are your personal loan interest rates?',
];

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonItem, IonInput, IonButton],
})
export class ChatPage {
  private readonly chat = inject(ChatService);

  @ViewChild(IonContent) private content?: IonContent;

  readonly draft = signal('');
  readonly messages = this.chat.messages;
  readonly isStreaming = this.chat.isStreaming;
  readonly suggestedQuestions = SUGGESTED_QUESTIONS;
  readonly showTypingIndicator = computed(() => {
    const msgs = this.messages();
    const last = msgs[msgs.length - 1];
    return this.isStreaming() && !!last && last.role === 'assistant' && last.content.length === 0;
  });

  constructor() {
    effect(() => {
      this.messages();
      queueMicrotask(() => void this.content?.scrollToBottom(200));
    });
  }

  onDraftChange(value: string | number | null | undefined): void {
    this.draft.set(value == null ? '' : String(value));
  }

  async send(): Promise<void> {
    const value = this.draft();
    const submitted = await this.submit(value);
    if (submitted) {
      this.draft.set('');
    }
  }

  async sendSuggestion(question: string): Promise<void> {
    await this.submit(question);
  }

  private async submit(value: string): Promise<boolean> {
    if (!value.trim() || this.isStreaming()) {
      return false;
    }
    await this.chat.sendMessage(value);
    return true;
  }
}
