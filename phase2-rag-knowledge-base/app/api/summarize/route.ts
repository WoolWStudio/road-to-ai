import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { summarizeRequestSchema } from "@/lib/schema";
import { z } from "zod";

export const maxDuration = 30;

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, modelType } = summarizeRequestSchema.parse(
      await req.json(),
    );

    const { text } = await generateText({
      model: openrouter(modelType), // 顺手修复：适配新版 AI SDK 的提供商调用方式
      system:
        "You are an expert in summarizing conversations. Based on the user's first message, create a short, concise, and descriptive title for the chat session. The title should be no more than 5-8 words and in the same language as the user's message. Do not add any quotes around the title.",
      prompt: message,
    });

    return new Response(JSON.stringify({ title: text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Summarization error:", error);

    // 优雅地拦截 Zod 抛出的校验错误
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
