import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, embed } from "ai";
import { sql } from "@vercel/postgres";
import { buildSystemPrompt } from "@/lib/prompt";

// 统一配置 OpenRouter
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// 允许最大执行时间（覆盖 Serverless 默认的极短超时限制）
export const maxDuration = 30;

export async function POST(req: Request) {
  // 1. 解析前端传来的 JSON，额外提取 modelType
  const { messages, modelType, isQuickAction } = await req.json();

  // 1.5 动态组装 System Prompt (系统提示词)
  let systemPrompt = buildSystemPrompt(isQuickAction);

  // --- Day 4: 向量检索 (Retrieval) 开始 ---
  try {
    // a. 获取用户最新的一条问题
    const lastMessage = messages[messages.length - 1];

    let userQuery = "";
    if (Array.isArray(lastMessage.parts)) {
      userQuery = lastMessage.parts.map((p: any) => p.text || "").join("");
    } else if (typeof lastMessage.content === "string") {
      userQuery = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      userQuery = lastMessage.content.map((p: any) => p.text || "").join("");
    }

    if (userQuery && !isQuickAction) {
      console.log("正在向量化用户问题:", userQuery);
      // b. 将用户问题转换为向量
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: userQuery,
      });

      const embeddingString = `[${embedding.join(",")}]`;

      // c. 在数据库中进行相似度搜索 (Cosine Distance)
      // <=> 是 pgvector 提供的余弦距离操作符，越小表示越相似
      // LIMIT 3 表示我们只取最相关的 3 个文本块
      const { rows } = await sql`
        SELECT chunk_content
        FROM document_chunks
        ORDER BY embedding <=> ${embeddingString}
        LIMIT 3
      `;

      // d. 将检索到的内容拼接到 System Prompt 中
      if (rows.length > 0) {
        const retrievedContext = rows
          .map((row) => row.chunk_content)
          .join("\n\n---\n\n");
        systemPrompt += `\n\n【知识库上下文】\n请优先根据以下检索到的知识库内容来回答用户的问题。如果上下文中没有相关信息，你可以结合你自身的知识进行回答，但请友好地提醒用户该回答并非来自知识库。\n\n${retrievedContext}`;
        console.log("检索成功，已将上下文注入提示词。");
      }
    }
  } catch (error) {
    console.error("向量检索失败:", error);
    // 检索失败不阻断普通聊天，只做日志记录
  }
  // --- Day 4: 向量检索 (Retrieval) 结束 ---

  let result;

  // 2. 核心路由分发：根据 modelType 调用不同的模型和清洗策略
  if (modelType !== "/api/chat") {
    // --- 免费模型 (OpenRouter) 分支 ---
    const model = openrouter.chat(modelType);
    const normalizedMessages = messages.map((msg: any) => {
      let text = "";
      if (Array.isArray(msg.parts)) {
        text = msg.parts.map((p: any) => p.text || "").join("");
      } else if (typeof msg.content === "string") {
        text = msg.content;
      } else if (Array.isArray(msg.content)) {
        text = msg.content.map((p: any) => p.text || "").join("");
      }
      return {
        role: msg.role === "assistant" ? "assistant" : "user",
        content: text,
      };
    });

    if (
      normalizedMessages.length > 0 &&
      normalizedMessages[0].role === "user"
    ) {
      normalizedMessages[0].content = `[系统设定：${systemPrompt}]\n\n${normalizedMessages[0].content}`;
    }

    result = streamText({
      model,
      messages: normalizedMessages,
    });
  } else {
    // --- 默认 ChatGPT 模型分支 ---
    result = streamText({
      model: openai("gpt-5-nano"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });
  }

  // 3. 将底层的流转换为标准的 HTTP Response
  return result.toUIMessageStreamResponse();
}
