import { z } from "zod";
import { UIMessage } from "ai";

export const chatRequestSchema = z.object({
  // 使用 z.custom 既能在运行时校验数组，又能完美推导 UIMessage[] 的静态类型
  messages: z.custom<UIMessage[]>(
    (val) => Array.isArray(val),
    "messages 必须是数组",
  ),
  modelType: z.string(),
  isQuickAction: z.boolean().default(false),
  documentId: z.string().optional(), // 允许前端传入 documentId
});

// 魔法：利用 Zod 自动推导出静态类型，供其他地方复用
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const summarizeRequestSchema = z.object({
  // 使用 .min(1) 替代原来的 if (!message) 判空逻辑
  message: z.string().min(1, "Message is required"),
  modelType: z.string(),
});

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;

export const documentUploadSchema = z.object({
  // 校验必须是数组，并且至少包含一个元素
  files: z.custom<File[]>(
    (val) => Array.isArray(val) && val.length > 0,
    "没有接收到文件或文件格式不正确",
  ),
});
