import { NextResponse } from "next/server";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { documentUploadSchema } from "@/lib/schema";
import { z } from "zod";

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

    // 将提取出的数据交给 Zod 强校验
    const { files } = documentUploadSchema.parse({
      files: formData.getAll("file"),
    });

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

      // --- Day 1 新增：在存入 chunk 前，先在 documents 表中创建一条主记录 ---
      const docInsertResult = await sql`
        INSERT INTO documents (file_name, status)
        VALUES (${file.name}, 'ready')
        RETURNING id
      `;
      const documentId = docInsertResult.rows[0].id;

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
          INSERT INTO document_chunks (document_id, file_name, chunk_content, embedding)
          VALUES (${documentId}, ${file.name}, ${chunks[i]}, ${embeddingString})
        `;
      }

      results.push({
        fileName: file.name,
        totalLength: cleanText.length,
        chunksCount: chunks.length,
        sampleChunks: chunks.slice(0, 2), // 恢复只返回前两个 chunk 供前端验证，避免控制台数据太多
        documentId, // 将数据库生成的文档 ID 返回给前端
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("处理文档时发生错误:", error);

    // 优雅拦截 Zod 校验错误
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- 获取所有文档列表 ---
export async function GET() {
  try {
    const { rows } = await sql`
      SELECT id, file_name, status, created_at 
      FROM documents 
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ success: true, documents: rows });
  } catch (error: any) {
    console.error("获取文档列表失败:", error);
    return NextResponse.json({ error: "获取文档列表失败" }, { status: 500 });
  }
}

// --- 删除指定文档 ---
export async function DELETE(req: Request) {
  try {
    // 从 URL 查询参数中获取 id (?id=...)
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // 借用 Zod 的 string().uuid() 做一次简单的防御性校验
    const validatedId = z.uuid("无效的文档 ID").parse(id);

    // 💡 架构魔法：因为我们在表结构上配置了 ON DELETE CASCADE
    // 这里只需删除主表记录，数据库会自动把 document_chunks 表里对应的所有向量块一并清理干净！
    await sql`
      DELETE FROM documents WHERE id = ${validatedId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("删除文档失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "删除文档失败" }, { status: 500 });
  }
}
