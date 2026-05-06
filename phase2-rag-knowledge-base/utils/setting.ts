// 定义一个辅助函数来安全地从 localStorage 获取初始值
export function getInitialSetting<T>(
  key: "role" | "tone" | "length" | "modelType",
  defaultValue: T,
): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const savedSettings = localStorage.getItem("ai-chat-settings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return settings[key] ?? defaultValue;
    }
    return defaultValue;
  } catch (error) {
    console.error("Failed to parse settings from localStorage", error);
    return defaultValue;
  }
}
