import { DynamicToolUIPart, UITool, UIToolInvocation } from "ai";

interface ToolInvocationsProps {
  toolParts: (
    | DynamicToolUIPart
    | ({
        type: `tool-${string}`;
      } & UIToolInvocation<UITool>)
  )[];
}

export function ToolInvocations({ toolParts }: ToolInvocationsProps) {
  if (!toolParts || toolParts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-2">
      {toolParts.map((part) => {
        // 匹配新版状态机
        const isLoading =
          part.state === "input-streaming" ||
          part.state === "input-available" ||
          part.state === "approval-requested";
        const isDone = part.state === "output-available";
        const isError = part.state === "output-error";

        // 获取工具名称 (旧版可能是 toolName，新版在 type 里形如 tool-searchKnowledgeBase)
        const toolName = part.type.replace("tool-", "");

        let statusIcon = "🔄";
        let statusText = `正在调用 ${toolName}...`;
        let styleClass = "text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50";

        if (isDone) {
          statusIcon = "✅";
          statusText =
            toolName === "searchKnowledgeBase"
              ? "知识库搜索完成"
              : `${toolName} 调用完成`;
          styleClass =
            "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400";
        } else if (isError) {
          statusIcon = "❌";
          statusText =
            toolName === "searchKnowledgeBase"
              ? "搜索失败"
              : `${toolName} 调用失败`;
          styleClass =
            "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
        } else if (toolName === "searchKnowledgeBase") {
          statusText = "正在搜索知识库...";
        }

        return (
          <div
            key={part.toolCallId}
            className={`flex items-center gap-2 p-2 rounded-md text-sm w-fit ${styleClass}`}
          >
            <span className={isLoading ? "animate-spin" : ""}>
              {statusIcon}
            </span>
            <span>{statusText}</span>
          </div>
        );
      })}
    </div>
  );
}
