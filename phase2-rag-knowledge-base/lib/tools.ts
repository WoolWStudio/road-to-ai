import { tool } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { sql } from "@vercel/postgres";

// 将工具导出改为高阶函数模式，接收请求的上下文参数 (documentId)
export const buildTools = (documentId?: string) => ({
  searchKnowledgeBase: tool({
    description: "当用户的问题可能需要参考知识库文档时，调用此工具进行检索。",
    inputSchema: z.object({
      query: z.string().describe("用来在向量数据库中进行语义搜索的查询语句"),
    }),
    execute: async ({ query }) => {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: query,
      });
      const embeddingString = `[${embedding.join(",")}]`;

      let results;

      // 💡 核心魔法：根据用户是否传了 documentId，动态决定 SQL 范围！
      if (documentId) {
        const res = await sql`
          SELECT file_name, chunk_content,
            1 - (embedding <=> ${embeddingString}::vector) AS similarity
          FROM document_chunks
          WHERE document_id = ${documentId}
          ORDER BY similarity DESC
          LIMIT 3
        `;
        results = res.rows;
      } else {
        const res = await sql`
          SELECT file_name, chunk_content,
            1 - (embedding <=> ${embeddingString}::vector) AS similarity
          FROM document_chunks
          ORDER BY similarity DESC
          LIMIT 3
        `;
        results = res.rows;
      }

      if (results.length === 0) return { found: false, sources: [] };

      return {
        found: true,
        sources: results.map((row) => ({
          fileName: row.file_name,
          content: row.chunk_content,
        })),
      };
    },
  }),
});
