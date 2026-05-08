import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import fs from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";

// 自动加载 Next.js 支持的所有环境变量文件 (.env, .env.local 等)
loadEnvConfig(process.cwd());

async function runEvals() {
  const evalSetPath = path.join(process.cwd(), "evals", "basic-eval-set.json");
  const evalData = JSON.parse(fs.readFileSync(evalSetPath, "utf8"));

  let totalScore = 0;
  let validQuestions = 0;

  console.log("🚀 开始运行 RAG 检索层评估 (Retrieval Evals)...\n");

  for (const item of evalData) {
    // 跳过没有 Context 的负面测试用例（因为它们主要用于测试 LLM 防幻觉，而非检索命中率）
    if (!item.contexts || item.contexts.length === 0) continue;

    validQuestions++;
    console.log(`[问题 ${validQuestions}] ${item.question}`);

    // 1. 将测试问题向量化
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: item.question,
    });
    const embString = `[${embedding.join(",")}]`;

    // 2. 模拟真实场景，在数据库中检索 Top-3 的相关文本块
    const { rows } = await sql`
      SELECT chunk_content, 1 - (embedding <=> ${embString}::vector) AS similarity
      FROM document_chunks
      ORDER BY similarity DESC
      LIMIT 3
    `;

    const retrievedText = rows.map((r) => r.chunk_content).join("\n");
    const expectedContext = item.contexts[0];

    // 3. 评判逻辑 (Judge)：
    // 考虑到分块时可能会从不同位置切断，我们取标准 Context 的前 30 个字符作为特征片段去匹配
    const checkSnippet = expectedContext.substring(0, 30);
    const isHit = retrievedText.includes(checkSnippet);

    if (isHit) {
      console.log(
        `   ✅ 命中! (最高相似度: ${rows[0]?.similarity.toFixed(3)})`,
      );
      totalScore++;
    } else {
      console.log(`   ❌ 未命中!`);
      console.log(`   🔍 期望找到的内容片段: "${checkSnippet}..."`);
    }
    console.log("--------------------------------------------------");
  }

  const hitRate = ((totalScore / validQuestions) * 100).toFixed(1);
  console.log(`\n📊 评估完成!`);
  console.log(
    `🎯 Top-3 检索命中率 (Hit Rate): ${hitRate}% (${totalScore}/${validQuestions})`,
  );
}

runEvals().catch(console.error);
