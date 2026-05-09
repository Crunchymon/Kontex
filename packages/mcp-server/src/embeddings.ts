import { GoogleGenerativeAI, TaskType, type EmbedContentRequest } from "@google/generative-ai";
import { EMBEDDING_DIMENSIONS } from "@kontex/shared";

export type EmbeddingClient = {
  embed(input: string): Promise<number[]>;
};

type EmbedContentRequestWithDims = EmbedContentRequest & { outputDimensionality?: number };

export function createEmbeddingClient(apiKey: string, model: string): EmbeddingClient {
  const genAi = new GoogleGenerativeAI(apiKey);
  const embedder = genAi.getGenerativeModel({ model });

  return {
    async embed(input: string) {
      const request: EmbedContentRequestWithDims = {
        content: { role: "user", parts: [{ text: input }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        outputDimensionality: EMBEDDING_DIMENSIONS
      };
      const response = await embedder.embedContent(request);
      const vector = response.embedding?.values;
      if (!vector) {
        throw new Error("Gemini returned no embedding vector");
      }
      if (vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding dimension mismatch: got ${vector.length}, expected ${EMBEDDING_DIMENSIONS}`
        );
      }
      return vector;
    }
  };
}
