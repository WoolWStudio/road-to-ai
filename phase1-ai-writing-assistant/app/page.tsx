"use client";

import { useState, useEffect } from "react";
import ChatSession from "@/components/ChatSession";
import { getInitialSetting } from "@/utils/setting";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function Home() {
  const [role, setRole] = useState("copywriter");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("short");
  const [modelType, setModelType] = useState("/api/free");
  const [isMounted, setIsMounted] = useState(false);

  // 1. 解决 SSR 水合问题：在客户端挂载后，从 localStorage 读取并设置状态
  useEffect(() => {
    setRole(getInitialSetting("role", "copywriter"));
    setTone(getInitialSetting("tone", "professional"));
    setLength(getInitialSetting("length", "short"));
    setModelType(getInitialSetting("modelType", "/api/free"));
    setIsMounted(true); // 标记为已挂载，此后才允许保存
  }, []); // 空依赖数组确保只在挂载时执行一次

  // 2. 状态持久化：当设置项变化时，将其存入 localStorage
  // 仅在组件挂载后 (isMounted) 执行，防止初始化的默认值覆盖 localStorage
  useEffect(() => {
    if (isMounted) {
      const settings = { role, tone, length, modelType };
      localStorage.setItem("ai-chat-settings", JSON.stringify(settings));
    }
  }, [role, tone, length, modelType, isMounted]);

  return (
    <main className="flex h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <SettingsPanel
        modelType={modelType}
        setModelType={setModelType}
        role={role}
        setRole={setRole}
        tone={tone}
        setTone={setTone}
        length={length}
        setLength={setLength}
        isMounted={isMounted}
      />
      <ChatSession
        role={role}
        tone={tone}
        length={length}
        modelType={modelType}
      />
    </main>
  );
}
