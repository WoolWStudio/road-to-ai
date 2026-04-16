"use client";

import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import ChatSession from "@/components/ChatSession";
import { getInitialSetting } from "@/utils/setting";

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
  console.log({ role, tone, length, modelType });

  return (
    <main className="flex h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      {/* 使用 isMounted 状态来控制设置面板的可见性，防止水合不匹配导致的闪烁 */}
      <aside
        className={`w-80 mr-4 flex flex-col gap-4 transition-opacity duration-300 ${
          isMounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <Card className="flex-1 p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">写作设置</h2>

          {/* 模型接口控制项 */}
          <div className="flex flex-col gap-2 mb-4">
            <label
              htmlFor="modelType"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              模型接口
            </label>
            <select
              id="modelType"
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="p-2 border rounded-md text-sm bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="/api/free">免费开源模型</option>
              <option value="/api/chat">ChatGPT 模型</option>
            </select>
          </div>

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

          {/* Day 2: 新增语气控制项 */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="tone"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              回复语气
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="p-2 border rounded-md text-sm bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="professional">正式专业</option>
              <option value="humorous">幽默风趣</option>
              <option value="strict">严谨客观</option>
              <option value="empathetic">温柔共情</option>
            </select>
          </div>

          {/* Day 2: 新增长度控制项 */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="length"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              篇幅长度
            </label>
            <select
              id="length"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="p-2 border rounded-md text-sm bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="short">简明扼要 (100字内)</option>
              <option value="medium">适中 (300-500字)</option>
              <option value="long">详尽展开 (800字以上)</option>
            </select>
          </div>
        </Card>
      </aside>

      <ChatSession
        role={role}
        tone={tone}
        length={length}
        modelType={modelType}
      />
    </main>
  );
}
