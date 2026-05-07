import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  UIMessage,
  ModelMessage,
} from "ai";
import { buildSystemPrompt } from "@/lib/prompt";
import { buildTools } from "@/lib/tools"; // 引入我们新建的高阶函数
import { chatRequestSchema } from "@/lib/schema";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  // parse() 会在运行时强校验数据。
  // 如果前端传了非法的 JSON，这里会直接抛出清晰的 ZodError 被 SDK 捕获，绝不会让脏数据搞崩你的核心业务逻辑。
  const { messages, modelType, isQuickAction, documentId } =
    chatRequestSchema.parse(await req.json());

  let systemPrompt = buildSystemPrompt(
    undefined,
    undefined,
    undefined,
    isQuickAction,
  );

  // 追加 RAG 引用标注指令 (Prompt Engineering)
  if (!isQuickAction) {
    systemPrompt +=
      "\n\n【重要指令】如果你调用工具检索了知识库，请务必在生成的回答中，使用 Markdown 脚注语法在相关句子的末尾标注来源（例如：这会导致利润下降[^1]）。并在全部回答的最后，列出对应的来源文件名（例如：[^1]: bp.txt）。不要编造来源，严格使用工具返回的 fileName。";
  }

  // tools 仅在非 Quick Action 时注入，避免不必要的 tool call
  const tools = isQuickAction ? undefined : buildTools(documentId);

  let result;

  if (modelType !== "/api/chat") {
    // OpenRouter 分支：手动拼接 system prompt（部分模型不支持 system 字段）
    const normalizedMessages: ModelMessage[] = messages.map((msg) => {
      let text = "";
      if ("parts" in msg && Array.isArray(msg.parts)) {
        text = msg.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
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
