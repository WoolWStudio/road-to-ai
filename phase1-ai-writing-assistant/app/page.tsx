"use client";

import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChangeEvent, useState, useRef, useEffect, useMemo } from "react";
import { DefaultChatTransport } from "ai";

function ChatSession({ role }: { role: string }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 useRef 追踪最新的 role (React 官方推荐的 "Latest Ref" 模式，用于连接外部实例)
  const payloadRef = useRef({ role });
  payloadRef.current.role = role;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: payloadRef.current,
      }),
    [],
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
        sendMessage({ text: textPart.text });
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
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
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap break-words ${
                  message.role === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white border dark:bg-zinc-900 dark:border-zinc-800"
                }`}
              >
                {/* 新版 API 推荐从 parts 渲染 */}
                {message.role === "user" ? "我：\n" : "AI：\n"}
                {message.parts?.map((part, index) =>
                  part.type === "text" ? (
                    <span key={index}>{part.text}</span>
                  ) : null,
                )}
              </div>
            </div>
          ))}

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
                  variant="outline"
                  size="sm"
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
          {/* 这里等会儿放输入框和发送按钮 */}
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

export default function Home() {
  const [role, setRole] = useState("copywriter");

  return (
    <main className="flex h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <aside className="w-80 mr-4 flex flex-col gap-4">
        <Card className="flex-1 p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">写作设置</h2>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="role"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              助手角色
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="p-2 border rounded-md text-sm bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="copywriter">专业撰稿人</option>
              <option value="social-media">小红书/微博爆款写手</option>
              <option value="academic">严谨学术研究员</option>
            </select>
          </div>
        </Card>
      </aside>

      {/* 移除 key 属性，防止组件被销毁，从而在切换角色时保留历史对话记录 */}
      <ChatSession role={role} />
    </main>
  );
}
