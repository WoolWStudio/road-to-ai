import { Button } from "@base-ui/react";

interface Session {
  id: string;
  name: string;
}

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSwitchChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export function SessionList({
  sessions,
  activeSessionId,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
}: SessionListProps) {
  return (
    <div className="p-4 border-b">
      <h2 className="text-lg font-semibold mb-2">会话列表</h2>
      <Button
        onClick={onNewChat}
        className="w-full mb-4 bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        + 新建对话
      </Button>
      <div className="flex flex-col gap-2">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-center gap-2">
            <Button
              onClick={() => onSwitchChat(session.id)}
              className={`w-full text-left justify-start truncate ${
                session.id === activeSessionId
                  ? "bg-zinc-200 dark:bg-zinc-800 font-semibold"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              {session.name}
            </Button>
            <Button
              onClick={() => onDeleteChat(session.id)}
              className="px-2 py-1 text-xs text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
