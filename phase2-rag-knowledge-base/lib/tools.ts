import { tool } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { sql } from "@vercel/postgres";

export const searchKnowledgeBase = tool({
  description:
    "在知识库中检索与用户问题最相关的内容片段。当需要查询产品文档、FAQ 或专有知识时调用。",
  inputSchema: z.object({
    query: z.string().describe("用于检索的查询语句，尽量简洁精准"),
    topK: z.number().optional().default(3).describe("返回的最相关片段数量"),
  }),
  execute: async ({ query, topK = 3 }) => {
    // 1. 向量化查询语句
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    const embeddingString = `[${embedding.join(",")}]`;

    // 2. 余弦距离检索
    const { rows } = await sql`
      SELECT chunk_content
      FROM document_chunks
      ORDER BY embedding <=> ${embeddingString}
      LIMIT ${topK}
    `;

    if (rows.length === 0) {
      return { found: false, context: "" };
    }

    const context = rows.map((r) => r.chunk_content).join("\n\n---\n\n");
    return { found: true, context };
  },
});
