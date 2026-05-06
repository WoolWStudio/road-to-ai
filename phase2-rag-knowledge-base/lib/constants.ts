export const MODEL_OPTIONS = [
  { value: "openai/gpt-oss-20b:free", label: "免费模型（openai/gpt-oss-20b）" },
  {
    value: "tencent/hy3-preview:free",
    label: "免费模型（tencent/hy3-preview:free）",
  },
  {
    value: "google/gemma-4-26b-a4b-it:free",
    label: "免费模型（google/gemma-4-26b-a4b-it:free）",
  },
  {
    value: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "免费模型（nvidia/nemotron-3-super-120b-a12b:free）",
  },
  { value: "/api/chat", label: "ChatGPT-5-nano 模型" },
];

export const ROLE_OPTIONS = [
  { value: "copywriter", label: "专业撰稿人" },
  { value: "social-media", label: "小红书/微博爆款写手" },
  { value: "academic", label: "严谨学术研究员" },
];

export const TONE_OPTIONS = [
  { value: "professional", label: "正式专业" },
  { value: "humorous", label: "幽默风趣" },
  { value: "strict", label: "严谨客观" },
  { value: "empathetic", label: "温柔共情" },
];

export const LENGTH_OPTIONS = [
  { value: "short", label: "简明扼要 (100字内)" },
  { value: "medium", label: "适中 (300-500字)" },
  { value: "long", label: "详尽展开 (800字以上)" },
];

export const QUICK_ACTIONS = [
  { label: "扩写", promptTemplate: "请对以下内容进行扩写：\n\n{text}" },
  {
    label: "缩写",
    promptTemplate: "请对以下内容进行缩写，使其更精简：\n\n{text}",
  },
  {
    label: "润色",
    promptTemplate: "请对以下内容进行润色，使其更具文采：\n\n{text}",
  },
];
