"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, X } from "lucide-react";

export function DocumentUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // 将新上传的文件追加到列表中
    setFiles((prev) => [...prev, ...acceptedFiles]);

    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("file", file);
      });

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("后端解析和分块结果:", data);
      alert("文件解析并分块成功！请打开浏览器控制台查看结果。");
    } catch (error) {
      console.error("上传失败:", error);
      alert("上传解析失败，请重试。");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
    },
    maxSize: 5 * 1024 * 1024, // 限制 5MB，避免初期测试导致 OOM 或超出免费额度
  });

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 拖拽上传区域 */}
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
        {isUploading ? (
          <p className="text-sm text-blue-500">正在解析文件...</p>
        ) : isDragActive ? (
          <p className="text-sm text-blue-500">松开鼠标上传文件</p>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600">点击或拖拽文件到此处</p>
            <p className="text-xs text-gray-400 mt-1">支持 TXT (最大 5MB)</p>
          </div>
        )}
      </div>

      {/* 上传文件列表展示 */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-gray-700">知识库文档</h4>
          <ul className="flex flex-col gap-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 text-sm border rounded-md bg-white shadow-sm"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-md text-gray-500 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
