// app/api/chat/route.ts  ← 精简后的路由
import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { buildSystemPrompt } from "@/lib/prompt";
import { searchKnowledgeBase } from "@/lib/tools"; // ← 引入 tool

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, modelType, isQuickAction } = await req.json();

  const systemPrompt = buildSystemPrompt(isQuickAction);

  // tools 仅在非 Quick Action 时注入，避免不必要的 tool call
  const tools = isQuickAction ? undefined : { searchKnowledgeBase };

  let result;

  if (modelType !== "/api/chat") {
    // OpenRouter 分支：手动拼接 system prompt（部分模型不支持 system 字段）
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
      model: openrouter.chat(modelType),
      messages: normalizedMessages,
      tools,
      stopWhen: stepCountIs(3),
    });
  } else {
    // 默认 OpenAI 分支
    result = streamText({
      model: openai("gpt-5-nano"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(3),
    });
  }

  return result.toUIMessageStreamResponse();
}
