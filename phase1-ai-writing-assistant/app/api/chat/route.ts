import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";

// 允许最大执行时间（覆盖 Serverless 默认的极短超时限制）
export const maxDuration = 30;

export async function POST(req: Request) {
  // 1. 解析前端传来的 JSON，提取配置参数
  const { messages, role, tone, length } = await req.json();
  console.log({ messages, role, tone, length });

  // 1.5 动态组装 System Prompt (系统提示词) - 角色设定
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

  // 组装语气 (Tone)
  if (tone === "humorous") {
    systemPrompt += " 你的语气应该幽默风趣，可以适当开点玩笑。";
  } else if (tone === "strict") {
    systemPrompt += " 你的语气必须非常严谨、客观，不掺杂个人感情。";
  } else if (tone === "empathetic") {
    systemPrompt += " 你的语气要温柔、富有同理心，像知心朋友一样。";
  } else {
    systemPrompt += " 请保持正式且专业的语气。";
  }

  // 组装长度 (Length)
  if (length === "short") {
    systemPrompt += " 请保持回答简明扼要，总字数控制在 100 字以内。";
  } else if (length === "long") {
    systemPrompt +=
      " 请尽可能详尽地展开描述，提供丰富的细节，总字数不少于 800 字。";
  } else {
    systemPrompt += " 回答篇幅保持适中即可（约 300 - 500 字）。";
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
