import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
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
  const { messages, role, tone, length, modelType, isQuickAction } =
    await req.json();
  console.log({ messages, role, tone, length, modelType, isQuickAction });

  // 1.5 动态组装 System Prompt (系统提示词)
  const systemPrompt = buildSystemPrompt(role, tone, length, isQuickAction);

  let result;

  // 2. 核心路由分发：根据 modelType 调用不同的模型和清洗策略
  if (modelType === "/api/free") {
    // --- 免费开源模型 (OpenRouter) 分支 ---
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
      model: openrouter.chat("openai/gpt-oss-20b:free"),
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
