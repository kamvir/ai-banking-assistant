import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';

export interface RetrievedChunk {
  content: string;
  title: string;
  source: string;
  category: string;
  score: number;
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const TOP_K = 4;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private vectorStorePromise?: Promise<PineconeStore>;

  constructor(private readonly config: ConfigService) {}

  async retrieve(query: string, k = TOP_K): Promise<RetrievedChunk[]> {
    const store = await this.getVectorStore();
    const results = await store.similaritySearchWithScore(query, k);

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      title: String(doc.metadata['title'] ?? doc.metadata['source'] ?? 'Untitled'),
      source: String(doc.metadata['source'] ?? 'unknown'),
      category: String(doc.metadata['category'] ?? ''),
      score,
    }));
  }

  private getVectorStore(): Promise<PineconeStore> {
    if (!this.vectorStorePromise) {
      this.vectorStorePromise = this.createVectorStore().catch((err: unknown) => {
        // Don't cache a failed attempt — let the next request retry from scratch.
        this.vectorStorePromise = undefined;
        throw err;
      });
    }
    return this.vectorStorePromise;
  }

  private async createVectorStore(): Promise<PineconeStore> {
    const apiKey = this.config.get<string>('PINECONE_API_KEY');
    const indexName = this.config.get<string>('PINECONE_INDEX_NAME');
    if (!apiKey || !indexName) {
      throw new Error('PINECONE_API_KEY and PINECONE_INDEX_NAME are not configured.');
    }

    const pinecone = new Pinecone({ apiKey });
    const pineconeIndex = pinecone.index(indexName);
    const embeddings = new OpenAIEmbeddings({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
      model: EMBEDDING_MODEL,
    });

    this.logger.log(`Connecting to Pinecone index "${indexName}"...`);
    return PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
  }
}
