"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatSession from "@/components/ChatSession";
import { getInitialSetting } from "@/utils/setting";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SessionList } from "@/components/SessionList";
import { MODEL_OPTIONS } from "@/lib/constants";
import { DocumentManager } from "@/components/DocumentManager";
import type { Session, Document } from "@/lib/types";

export default function Home() {
  const [modelType, setModelType] = useState(MODEL_OPTIONS[0].value);
  const [isMounted, setIsMounted] = useState(false);

  // 会话管理状态
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // 文档范围管理状态
  const [documents, setDocuments] = useState<Document[]>([]);

  // 1. 解决 SSR 水合问题：在客户端挂载后，从 localStorage 读取并设置状态
  useEffect(() => {
    // 读取设置
    setModelType(getInitialSetting("modelType", MODEL_OPTIONS[0].value));

    // 读取会话列表
    const savedSessions = localStorage.getItem("ai-sessions");
    const savedActiveId = localStorage.getItem("ai-active-session-id");

    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions);
      setSessions(parsedSessions);
      const activeExists = parsedSessions.some(
        (s: Session) => s.id === savedActiveId,
      );
      setActiveSessionId(
        activeExists ? savedActiveId : (parsedSessions[0]?.id ?? null),
      );
    } else {
      // 如果没有历史会话，则创建一个新的
      const newId = uuidv4();
      const newSession: Session = {
        id: newId,
        name: "新对话",
        documentId: "all",
      };
      setSessions([newSession]);
      setActiveSessionId(newId);
    }

    setIsMounted(true); // 标记为已挂载，此后才允许保存
  }, []); // 空依赖数组确保只在挂载时执行一次

  // 动态获取文档列表，并监听自定义事件以便在 DocumentManager 上传/删除时自动刷新
  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };
  useEffect(() => {
    fetchDocuments();
    window.addEventListener("documentsUpdated", fetchDocuments);
    return () => window.removeEventListener("documentsUpdated", fetchDocuments);
  }, []);

  // 2. 状态持久化：当设置项变化时，将其存入 localStorage
  // 仅在组件挂载后 (isMounted) 执行，防止初始化的默认值覆盖 localStorage
  useEffect(() => {
    if (isMounted) {
      const settings = { modelType };
      localStorage.setItem("ai-chat-settings", JSON.stringify(settings));

      // 保存会话列表
      localStorage.setItem("ai-sessions", JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem("ai-active-session-id", activeSessionId);
      }
    }
  }, [modelType, sessions, activeSessionId, isMounted]);

  const handleNewChat = () => {
    const newId = uuidv4();
    const newSession: Session = {
      id: newId,
      name: "新对话",
      documentId: "all",
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const handleDeleteChat = (idToDelete: string) => {
    // 清除该会话的聊天记录
    localStorage.removeItem(`chat_${idToDelete}`);
    // 从会话列表中移除
    const newSessions = sessions.filter((s) => s.id !== idToDelete);
    setSessions(newSessions);
    // 如果删除的是当前会话，则切换到另一个会话
    if (activeSessionId === idToDelete) {
      setActiveSessionId(newSessions[newSessions.length - 1]?.id ?? null);
    }
  };

  const handleTitleGeneration = async (
    sessionId: string,
    firstUserMessage: string,
  ) => {
    const session = sessions.find((s) => s.id === sessionId);
    // 仅当会话名称为默认值时才生成
    if (session && session.name === "新对话") {
      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: firstUserMessage, modelType }),
        });
        if (!response.ok) throw new Error("Failed to fetch summary");
        const { title } = await response.json();
        if (title) {
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, name: title } : s)),
          );
        }
      } catch (error) {
        console.error("Could not generate title:", error);
      }
    }
  };

  // 动态计算：获取当前活动会话的选中记录，默认为 "all"
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const selectedDocumentId = activeSession?.documentId || "all";

  // 当用户在下拉菜单中切换文档时，只更新当前会话的绑定范围
  const handleDocumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDocId = e.target.value;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, documentId: newDocId } : s,
      ),
    );
  };

  return (
    <main className="flex flex-col md:flex-row h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <aside
        className={`w-full md:w-80 mb-4 md:mb-0 md:mr-4 flex flex-col gap-4 transition-opacity duration-300 ${
          isMounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSwitchChat={setActiveSessionId}
          onDeleteChat={handleDeleteChat}
        />
        <SettingsPanel
          {...{
            modelType,
            setModelType,
            isMounted,
          }}
        />
        <DocumentManager />

        {/* 检索范围选择器 */}
        <div className="flex flex-col gap-2 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm mt-auto">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            🎯 检索范围限制
          </label>
          <select
            value={selectedDocumentId}
            onChange={handleDocumentChange}
            className="p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
          >
            <option value="all">📚 全局搜索 (所有文档)</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                📄 {doc.file_name}
              </option>
            ))}
          </select>
        </div>
      </aside>
      {activeSessionId && (
        <ChatSession
          key={activeSessionId}
          sessionId={activeSessionId}
          onTitleGeneration={handleTitleGeneration}
          {...{ modelType }}
          documentId={
            selectedDocumentId === "all" ? undefined : selectedDocumentId
          }
        />
      )}
    </main>
  );
}
