import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export const maxDuration = 30;

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { text } = await generateText({
      model: openrouter.chat("openai/gpt-oss-20b:free"),
      system:
        "You are an expert in summarizing conversations. Based on the user's first message, create a short, concise, and descriptive title for the chat session. The title should be no more than 5-8 words and in the same language as the user's message. Do not add any quotes around the title.",
      prompt: message,
    });

    return new Response(JSON.stringify({ title: text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Summarization error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
