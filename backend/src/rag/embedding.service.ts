import { Injectable, Logger } from '@nestjs/common';
import {
  embedLocal,
  LOCAL_EMBED_DIMS,
  LOCAL_EMBED_MODEL,
} from './embedding.util';

export type EmbeddingResult = {
  vector: number[];
  model: string;
  dims: number;
};

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  async embed(text: string): Promise<EmbeddingResult> {
    const provider = (process.env.RAG_EMBEDDING_PROVIDER || 'local').toLowerCase();
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      try {
        return await this.embedOpenAI(text);
      } catch (err) {
        this.logger.warn(`OpenAI embed failed, falling back to local: ${err}`);
      }
    }
    return {
      vector: embedLocal(text),
      model: LOCAL_EMBED_MODEL,
      dims: LOCAL_EMBED_DIMS,
    };
  }

  private async embedOpenAI(text: string): Promise<EmbeddingResult> {
    const model =
      process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const dims = Number(process.env.RAG_VECTOR_DIMS || LOCAL_EMBED_DIMS);
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 8000),
        dimensions: dims,
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      data: { embedding: number[] }[];
    };
    const vector = data.data[0]?.embedding;
    if (!vector?.length) throw new Error('Empty embedding');
    return { vector, model: `${model}:${dims}`, dims: vector.length };
  }
}
