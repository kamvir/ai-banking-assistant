import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';

const KNOWLEDGE_DIR = join(__dirname, 'knowledge');
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

const CATEGORY_LABELS: Record<string, string> = {
  accounts: 'Accounts',
  fees: 'Fees',
  kyc: 'KYC',
  loans: 'Loans',
};

interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
}

function loadDocs(): KnowledgeDoc[] {
  const files = readdirSync(KNOWLEDGE_DIR).filter((file) => file.endsWith('.md'));
  return files.map((file) => {
    const raw = readFileSync(join(KNOWLEDGE_DIR, file), 'utf-8');
    const [firstLine, ...rest] = raw.split('\n');
    const id = basename(file, '.md');
    const categoryKey = id.split('-')[0];
    return {
      id,
      title: firstLine.replace(/^#\s*/, '').trim(),
      category: CATEGORY_LABELS[categoryKey] ?? categoryKey,
      content: rest.join('\n').trim(),
    };
  });
}

async function ensureIndex(pinecone: Pinecone, indexName: string): Promise<void> {
  const { indexes } = await pinecone.listIndexes();
  if (indexes?.some((index) => index.name === indexName)) {
    return;
  }

  console.log(`Index "${indexName}" not found — creating a new serverless index...`);
  await pinecone.createIndex({
    name: indexName,
    dimension: EMBEDDING_DIMENSION,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: (process.env.PINECONE_CLOUD as 'aws' | 'gcp' | 'azure' | undefined) ?? 'aws',
        region: process.env.PINECONE_REGION ?? 'us-east-1',
      },
    },
    waitUntilReady: true,
  });
}

async function main(): Promise<void> {
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!pineconeApiKey || !indexName) {
    throw new Error('PINECONE_API_KEY and PINECONE_INDEX_NAME must be set in apps/api/.env');
  }
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY must be set in apps/api/.env');
  }

  const pinecone = new Pinecone({ apiKey: pineconeApiKey });
  await ensureIndex(pinecone, indexName);
  const index = pinecone.index(indexName);

  const docs = loadDocs();
  console.log(`Loaded ${docs.length} knowledge base docs.`);

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 75 });

  const chunks: Document[] = [];
  for (const doc of docs) {
    const pieces = await splitter.splitText(doc.content);
    pieces.forEach((text, chunkIndex) => {
      chunks.push(
        new Document({
          pageContent: text,
          metadata: { source: doc.id, title: doc.title, category: doc.category, chunk: chunkIndex },
        }),
      );
    });
  }
  console.log(`Split into ${chunks.length} chunks.`);

  const embeddings = new OpenAIEmbeddings({ apiKey: openaiApiKey, model: EMBEDDING_MODEL });

  // Clear out any previous ingestion so re-running this script doesn't accumulate stale duplicates.
  await index.deleteAll().catch(() => undefined);

  await PineconeStore.fromDocuments(chunks, embeddings, { pineconeIndex: index });

  console.log(`Ingestion complete: ${chunks.length} vectors upserted into "${indexName}".`);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exitCode = 1;
});
