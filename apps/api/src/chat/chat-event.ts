export interface ChatSource {
  title: string;
  category: string;
}

export type ChatStreamEvent =
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'content'; content: string }
  | { type: 'escalate'; message: string }
  | { type: 'error'; error: string };
