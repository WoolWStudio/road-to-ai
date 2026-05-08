import { useChat } from "@ai-sdk/react";
import { Button, Input } from "@base-ui/react";
import { useState, useRef, useEffect, ChangeEvent, useMemo } from "react";
import { Card } from "./ui/card";
import { DefaultChatTransport } from "ai";
import { MessageBubble } from "./MessageBubble";
import toast from "react-hot-toast";
interface ChatSessionProps {
  sessionId: string;
  modelType: string;
  onTitleGeneration: (sessionId: string, firstUserMessage: string) => void;
  documentId?: string;
}

function ChatSession({
  sessionId,
  modelType,
  onTitleGeneration,
  documentId, // 接收上层传来的范围 ID
}: ChatSessionProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [], // 空依赖数组确保 transport 实例只创建一次
  );

  // 新增提取 setMessages 方法，用于将本地缓存恢复到视图
  const { messages, setMessages, sendMessage, status, error, stop } = useChat({
    id: sessionId, // 关键：将 useChat 与特定会话 ID 绑定
    transport,
    onError: (err) => {
      console.error("Chat API Error:", err);
      toast.error(err.message || "请求对话失败");
    },
  });

  const isInitialMount = useRef(true);

  // 1. 初始化：组件挂载时，从 localStorage 读取并恢复历史记录
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_${sessionId}`);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("解析本地历史记录失败", e);
      }
    }
  }, [sessionId, setMessages]);

  // 2. 持久化：当 messages 变化时，保存到 localStorage，但跳过首次渲染
  useEffect(() => {
    if (isInitialMount.current) {
      // 跳过首次渲染，防止用初始空数组覆盖已有历史记录
      isInitialMount.current = false;
      return;
    }
    if (messages.length > 0) {
      localStorage.setItem(`chat_${sessionId}`, JSON.stringify(messages));
    } else {
      // 如果 messages 为空（例如用户点击了清空），则从 localStorage 中移除记录
      localStorage.removeItem(`chat_${sessionId}`);
    }
  }, [messages, sessionId]);

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
          { body: { modelType, documentId } }, // 将模型和文档范围限制一并传给后端
        );
      }
    }
  };

  // 处理快捷操作点击事件
  const handleQuickAction = (aiContent: string, promptTemplate: string) => {
    const newPrompt = promptTemplate.replace("{text}", aiContent);
    sendMessage(
      { text: newPrompt }, // 构造一个新的“隐藏”用户消息。新版 SDK 使用 `text` 属性
      { body: { modelType, isQuickAction: true, documentId } }, // 附带当前设置，并标记为快捷操作
    );
  };

  // 处理复制功能，并提供 2 秒的“已复制”状态反馈
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (trimmedInput) {
      // 如果这是会话的第一条消息，则触发标题生成
      if (messages.length === 0) {
        onTitleGeneration(sessionId, trimmedInput);
      }
      sendMessage({ text: trimmedInput }, { body: { modelType, documentId } });
      setInput("");
    }
  };

  // 处理清空对话
  const handleClear = () => {
    if (window.confirm("确定要清空当前的对话记录吗？")) {
      setMessages([]); // 清空状态，触发 useEffect 自动清空 localStorage
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
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isLastMessage={isLastMessage}
                status={status}
                copiedId={copiedId}
                handleQuickAction={handleQuickAction}
                handleCopy={handleCopy}
                handleReload={handleReload}
              />
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
            <Button
              className="rounded-lg px-3 py-1 cursor-pointer bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
              type="button"
              onClick={handleClear}
              disabled={messages.length === 0 || status !== "ready"} // 没消息或AI正在生成时禁用
            >
              清空对话框
            </Button>
            <Input
              className="flex-1 px-2"
              placeholder="输入文字"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status !== "ready"}
            />
            {/* 动态切换：就绪时显示“发送”，请求时显示“停止” */}
            {status === "ready" || status === "error" ? (
              <Button
                className="rounded-lg px-2 py-1 cursor-pointer bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                type="submit"
                disabled={!input.trim()} // 输入框为空时禁用发送
              >
                发送
              </Button>
            ) : (
              <Button
                className="rounded-lg px-2 py-1 cursor-pointer bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                type="button"
                onClick={() => stop()} // 调用 useChat 提供的 stop 方法
              >
                停止生成
              </Button>
            )}
          </form>
        </div>
      </Card>
    </section>
  );
}
export default ChatSession;
