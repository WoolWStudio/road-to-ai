import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";

// 允许最大执行时间（覆盖 Serverless 默认的极短超时限制）
export const maxDuration = 30;

export async function POST(req: Request) {
  // 1. 解析前端传来的 JSON，提取历史对话数组
  const { messages } = await req.json();
  console.log({ messages });

  // 2. 结合 SDK 调用模型，天然支持流式输出
  const result = streamText({
    model: openai("gpt-5-nano"),
    messages: await convertToModelMessages(messages),
  });

  // 3. 将底层的流转换为标准的 HTTP Response
  return result.toUIMessageStreamResponse();
}
