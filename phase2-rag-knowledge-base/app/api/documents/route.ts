import { NextResponse } from "next/server";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { documentUploadSchema } from "@/lib/schema";
import { z } from "zod";
import { chunkText } from "@/lib/chunking";

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

      // 执行分块
      const chunks = chunkText(cleanText, 500, 100);

      // --- Day 3: Embeddings 与 向量数据库入库 ---
      // 1. 调用大模型 API，将文本块批量转化为向量 (Embeddings)
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: chunks,
      });

      // 💡 工程优化 1：防脏数据。将主记录插入移到不稳定的大模型 API 调用成功之后
      const docInsertResult = await sql`
        INSERT INTO documents (file_name, status)
        VALUES (${file.name}, 'ready')
        RETURNING id
      `;
      const documentId = docInsertResult.rows[0].id;

      // 💡 工程优化 2：分批并发写入 (Batch Processing)
      // 避免成千上万个 chunk 的无限制 Promise.all 撑爆 Serverless 数据库连接池
      const BATCH_SIZE = 50;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchPromises = chunks
          .slice(i, i + BATCH_SIZE)
          .map((chunk, index) => {
            const globalIndex = i + index;
            const embeddingString = `[${embeddings[globalIndex].join(",")}]`;
            return sql`
            INSERT INTO document_chunks (document_id, file_name, chunk_content, embedding)
            VALUES (${documentId}, ${file.name}, ${chunk}, ${embeddingString})
          `;
          });
        await Promise.all(batchPromises);
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
      return NextResponse.json({ error: error.message }, { status: 400 });
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

    // 借用 Zod 的 uuid() 做一次简单的防御性校验
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "删除文档失败" }, { status: 500 });
  }
}
