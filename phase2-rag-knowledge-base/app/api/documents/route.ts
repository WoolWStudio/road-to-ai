import { NextResponse } from "next/server";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";

// 简单的文本分块函数 (滑动窗口切片)
// chunkSize: 每个文本块的最大长度
// chunkOverlap: 块与块之间的重叠字数，防止关键信息刚好在切分边缘被截断
function chunkText(text: string, chunkSize = 500, chunkOverlap = 100) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - chunkOverlap;
  }
  return chunks;
}

export async function POST(req: Request) {
  try {
    // 解析前端传来的 FormData
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "没有接收到文件" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      let text = "";

      if (file.type === "text/plain") {
        // 解析 TXT
        text = await file.text();
      } else {
        console.warn(`不支持的文件类型: ${file.type}`);
        continue;
      }

      // 基础清洗：去除多余的连续空行
      const cleanText = text.replace(/\n\s*\n/g, "\n").trim();

      // 执行分块
      const chunks = chunkText(cleanText, 500, 100);

      // --- Day 3: Embeddings 与 向量数据库入库 ---
      // 1. 调用大模型 API，将文本块批量转化为向量 (Embeddings)
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: chunks,
      });

      // 2. 将文本块和对应的向量存入 Vercel Postgres 数据库
      for (let i = 0; i < chunks.length; i++) {
        // pgvector 期望的向量格式是 '[0.1, 0.2, ...]' 这样的字符串
        const embeddingString = `[${embeddings[i].join(",")}]`;

        await sql`
          INSERT INTO document_chunks (file_name, chunk_content, embedding)
          VALUES (${file.name}, ${chunks[i]}, ${embeddingString})
        `;
      }

      results.push({
        fileName: file.name,
        totalLength: cleanText.length,
        chunksCount: chunks.length,
        sampleChunks: chunks.slice(0, 2), // 恢复只返回前两个 chunk 供前端验证，避免控制台数据太多
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("处理文档时发生错误:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
