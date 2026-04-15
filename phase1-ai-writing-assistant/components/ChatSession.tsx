import { useChat } from "@ai-sdk/react";
import { Button, Input } from "@base-ui/react";
import { useState, useRef, useEffect, ChangeEvent, useMemo } from "react";
import { Card } from "./ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DefaultChatTransport } from "ai";

interface ChatSessionProps {
  role: string;
  tone: string;
  length: string;
  modelType: string;
}

function ChatSession({ role, tone, length, modelType }: ChatSessionProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [], // 空依赖数组确保 transport 实例只创建一次
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => {
      console.error("Chat API Error:", err);
      // 这里未来可以接全局的 Toast 提示组件，如 toast.error(err.message)
    },
  });

  // 提取最新 API 适用的重新发送逻辑
  const handleReload = () => {
    // 1. 找到列表中最后一条用户发送的消息
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMessage) {
      // 2. 从 parts 中提取文本并重新发送
      const textPart = lastUserMessage.parts?.find((p) => p.type === "text");
      if (textPart && textPart.text) {
        sendMessage(
          { text: textPart.text },
          { body: { role, tone, length, modelType } }, // 将模型选择一并传给后端
        );
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input }, { body: { role, tone, length, modelType } });
      setInput("");
    }
  };

  return (
    <section className="flex-1 flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden relative">
        {/* 1. 聊天记录滚动区 (占满剩余空间 flex-1, 内容多了可以滚动 overflow-y-auto) */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-zinc-500 mt-10">
              欢迎使用 AI 写作助手，今天想写点什么？
            </div>
          )}
          {messages.map((message) => {
            // 核心修复：从 message.parts 中安全地提取并拼接文本内容
            const content = message.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("");

            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-none rounded-lg p-3 text-sm ${
                    message.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 whitespace-pre-wrap break-words"
                      : "bg-white border dark:bg-zinc-900 dark:border-zinc-800 prose prose-sm dark:prose-invert"
                  }`}
                >
                  {message.role === "user" ? "我：\n" : "AI：\n"}
                  {message.role === "user" ? (
                    content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            );
          })}

          {/* 任务2: AI 正在思考时的加载提示 */}
          {status === "submitted" && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 text-sm bg-white border dark:bg-zinc-900 dark:border-zinc-800 text-zinc-500 animate-pulse">
                AI正在思考中...
              </div>
            </div>
          )}

          {/* Day 5 任务: 错误处理与重试机制 */}
          {error && (
            <div className="flex justify-center mt-2">
              <div className="flex flex-col items-center p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900/50">
                <p className="mb-3">
                  发生错误：{error.message || "请求超时或网络异常"}
                </p>
                <Button
                  onClick={handleReload}
                  className="bg-white dark:bg-zinc-950 hover:bg-zinc-100"
                >
                  重新生成
                </Button>
              </div>
            </div>
          )}

          {/* 任务3: 用来锚定滚动到底部的空元素 */}
          <div ref={messagesEndRef} />
        </div>

        {/* 2. 底部输入区 (固定在底部，有上边框分隔) */}
        <div className="p-4 border-t bg-white dark:bg-zinc-900">
          <form className="flex gap-2" onSubmit={(e) => handleSubmit(e)}>
            <Input
              className="flex-1"
              placeholder="输入文字"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status !== "ready"}
            />
            <Button
              className="cursor-pointer"
              type="submit"
              disabled={status !== "ready"}
            >
              发送
            </Button>
          </form>
        </div>
      </Card>
    </section>
  );
}
export default ChatSession;
