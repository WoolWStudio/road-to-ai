"use client";

import { Card } from "@/components/ui/card";
import { useState } from "react";
import ChatSession from "@/components/ChatSession";

export default function Home() {
  const [role, setRole] = useState("copywriter");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("short");
  const [modelType, setModelType] = useState("free");

  return (
    <main className="flex h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <aside className="w-80 mr-4 flex flex-col gap-4">
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
