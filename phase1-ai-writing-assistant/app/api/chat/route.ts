import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";

// 允许最大执行时间（覆盖 Serverless 默认的极短超时限制）
export const maxDuration = 30;

export async function POST(req: Request) {
  // 1. 解析前端传来的 JSON，提取历史对话数组和前台传过来的角色配置 (role)
  const { messages, role } = await req.json();
  console.log({ messages, role });

  // 1.5 动态组装 System Prompt (系统提示词)
  let systemPrompt = "你是一个专业的 AI 写作助手。";
  if (role === "social-media") {
    systemPrompt =
      "你是一个深谙爆款逻辑的社交媒体运营专家，擅长写小红书、微博等平台的文案。风格要求活泼、网感强，且熟练穿插使用各种 emoji 🚀🔥✨。";
  } else if (role === "academic") {
    systemPrompt =
      "你是一个严谨的学术研究员。回答问题客观、准确，语言正式，擅长逻辑分析和学术论文写作。";
  } else if (role === "copywriter") {
    systemPrompt =
      "你是一个资深的商业撰稿人。文字优雅、富有逻辑，擅长长文输出、品牌故事和结构化表达。";
  }

  // 2. 结合 SDK 调用模型，天然支持流式输出
  const result = streamText({
    model: openai("gpt-5-nano"),
    system: systemPrompt, // 在这里将设定好的人设注入给模型
    messages: await convertToModelMessages(messages),
  });

  // 3. 将底层的流转换为标准的 HTTP Response
  return result.toUIMessageStreamResponse();
}
