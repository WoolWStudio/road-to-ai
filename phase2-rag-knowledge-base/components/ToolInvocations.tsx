import { DynamicToolUIPart, UITool, UIToolInvocation } from "ai";

interface ToolInvocationsProps {
  toolParts: (
    | DynamicToolUIPart
    | ({
        type: `tool-${string}`;
      } & UIToolInvocation<UITool>)
  )[];
}

type PartOutput = {
  found: boolean;
  sources: { filename: string; content: string }[];
};

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
        let citations = null;

        if (isDone) {
          statusIcon = "✅";
          statusText =
            toolName === "searchKnowledgeBase"
              ? "知识库搜索完成"
              : `${toolName} 调用完成`;
          styleClass =
            "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400";

          const toolResult = part.output as PartOutput;

          // 解析引用来源 (Citations)
          if (toolName === "searchKnowledgeBase" && toolResult) {
            if (toolResult.found && Array.isArray(toolResult.sources)) {
              // 提取并去重 fileName
              const fileNames = Array.from(
                new Set(toolResult.sources.map((s: any) => s.fileName)),
              ) as string[];
              citations = fileNames.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300"
                >
                  📄 {name}
                </span>
              ));
            }
          }
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
            {citations && (
              <div className="ml-2 border-l border-emerald-200 dark:border-emerald-700 pl-2 flex gap-1">
                {citations}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
