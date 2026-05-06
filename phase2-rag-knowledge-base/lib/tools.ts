import { tool } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { sql } from "@vercel/postgres";

export const searchKnowledgeBase = tool({
  description:
    "当你需要回答关于内部文档、或者是用户上传资料的问题时，调用此工具来检索知识库。",
  inputSchema: z.object({
    query: z
      .string()
      .describe("从用户问题中提取出的精确搜索关键词或核心意图概念。"),
    topK: z.number().optional().default(3).describe("返回的最相关片段数量"),
  }),
  execute: async ({ query }) => {
    try {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: query,
      });
      const embeddingString = `[${embedding.join(",")}]`;

      // 核心修改 1：把 file_name 也查询出来
      const { rows } = await sql`
        SELECT file_name, chunk_content
        FROM document_chunks
        ORDER BY embedding <=> ${embeddingString}
        LIMIT 3
      `;

      if (rows.length > 0) {
        console.log("🛠️ 工具执行成功，已返回检索结果。");
        // 核心修改 2：返回结构化的 JSON，而非拼接的文本
        return {
          found: true,
          sources: rows.map((row) => ({
            fileName: row.file_name,
            content: row.chunk_content,
          })),
        };
      }
      return { found: false, message: "未找到与该问题相关的文档内容。" };
    } catch (error) {
      console.error("🛠️ 工具执行失败:", error);
      return { found: false, message: "知识库数据库当前不可用或发生超时。" };
    }
  },
});
