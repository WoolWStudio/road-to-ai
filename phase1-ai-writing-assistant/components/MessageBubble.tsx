import { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@base-ui/react";
import { QUICK_ACTIONS } from "@/lib/constants";

interface MessageBubbleProps {
  message: UIMessage;
  isLastMessage: boolean;
  status: "streaming" | "ready" | "submitted" | "error";
  copiedId: string | null;
  handleQuickAction: (content: string, promptTemplate: string) => void;
  handleCopy: (id: string, text: string) => void;
  handleReload: () => void;
}

export function MessageBubble({
  message,
  isLastMessage,
  status,
  copiedId,
  handleQuickAction,
  handleCopy,
  handleReload,
}: MessageBubbleProps) {
  const content = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div
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
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ref, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;
                  return !isInline ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} ref={ref} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
            {/* 快捷操作按钮区域 */}
            <div className="flex gap-2 mt-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  className="px-3 py-1 text-xs border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  onClick={() =>
                    handleQuickAction(content, action.promptTemplate)
                  }
                  disabled={status !== "ready"}
                >
                  {action.label}
                </Button>
              ))}
              <Button
                className="px-3 py-1 text-xs border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                onClick={() => handleCopy(message.id, content)}
                disabled={status !== "ready"}
              >
                {copiedId === message.id ? "已复制 ✓" : "复制"}
              </Button>
              {isLastMessage && (
                <Button
                  className="px-3 py-1 text-xs border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  onClick={handleReload}
                  disabled={status !== "ready"}
                >
                  重新生成
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
