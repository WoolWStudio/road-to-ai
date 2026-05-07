"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@base-ui/react";
import { useDropzone } from "react-dropzone";
import type { Document } from "@/lib/types";

export function DocumentManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 每次打开抽屉时，重新获取最新的文档列表
  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      const formData = new FormData();
      // 支持同时拖拽上传多个文件
      acceptedFiles.forEach((file) => formData.append("file", file));

      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          await fetchDocuments(); // 上传成功后刷新列表
          // 触发全局事件，通知外部组件（如侧边栏的文档选择器）更新列表
          window.dispatchEvent(new Event("documentsUpdated"));
        } else {
          const error = await res.json();
          alert(error.error || "上传失败");
        }
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [fetchDocuments],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
    },
    maxSize: 5 * 1024 * 1024, // 限制 5MB
  });

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这份文档吗？相关的知识库也会一并被清空。")) return;

    try {
      const res = await fetch(`/api/documents?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchDocuments(); // 删除成功后刷新列表
        // 触发全局事件，通知外部组件更新列表
        window.dispatchEvent(new Event("documentsUpdated"));
      } else {
        const error = await res.json();
        alert(error.error || "删除失败");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <>
      {/* 页面右上角的触发按钮 */}
      <Button
        className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        📚 知识库管理
      </Button>

      {/* 遮罩层与抽屉容器 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex justify-end">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          {/* 从右侧滑出的抽屉面板 */}
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold">文档管理</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-6">
                <div
                  {...getRootProps()}
                  className={`w-full py-6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                  } ${isUploading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                >
                  <input {...getInputProps()} />
                  <span className="text-3xl mb-2 text-zinc-400">📄</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                    {isUploading
                      ? "正在处理和向量化..."
                      : isDragActive
                        ? "松开鼠标上传文件"
                        : "点击或拖拽 TXT 文档到此处"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  已上传的文档
                </h3>
                {isLoading ? (
                  <div className="text-center py-8 text-zinc-400 text-sm">
                    加载中...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-sm">
                    知识库还是空的，快去上传吧！
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span
                          className="truncate font-medium text-sm"
                          title={doc.file_name}
                        >
                          {doc.file_name}
                        </span>
                        <span className="text-xs text-zinc-500 mt-1">
                          {new Date(doc.created_at).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors ml-2 flex-shrink-0"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
