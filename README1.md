# 第一阶段：定制化 AI 写作助手 (第 1-3 周)

本阶段我们的目标是快速建立信心，在你的舒适区（前端）利用 Vercel AI SDK 跑通大模型应用的最核心链路。完成此阶段后，你将拥有一个可部署、可展示的定制化 AI 写作助手。

## 🎯 核心聚焦点
- **大模型 API 基础**：理解请求/响应结构，掌握多轮对话（Messages）的本质。
- **Vercel AI SDK**：掌握前端流式输出（Streaming）的工业级标准做法。
- **Prompt 工程**：掌握 System Prompt 的动态组装，实现不同风格/场景的写作控制。
- **产品体验 (UX)**：Markdown 渲染、加载状态、停止生成、复制等 AI 产品的标配功能。

---

## 📅 具体到天的代码行动指南

> **时间管理提示**：每天安排 2-3 小时高质量编码时间。周末（Day 6-7）作为缓冲，用于复习、查漏补缺或休息，防止倦怠。

### 第一周 (Week 1)：基础设施与流式对话 MVP
目标：从零搭建 Next.js 项目，打通大模型流式对话的核心链路。

* **Day 1: 项目初始化与 UI 骨架**
  * 使用 `npx create-next-app@latest` 初始化 Next.js (App Router) + TypeScript + TailwindCSS 项目。
  * 安装并配置 `shadcn/ui`，引入必要的组件（Button, Input, Textarea, Card）。
  * 搭建基础的聊天界面布局（左侧边栏、右侧对话主窗口）。
* **Day 2: LLM API 基础接入 (无流式)**
  * 注册并获取 OpenAI (或 Anthropic / DeepSeek) 的 API Key。
  * 在 Next.js 的 Route Handler (e.g., `app/api/chat/route.ts`) 中实现基础的文本补全请求。
  * 测试基础的环境变量配置 (`.env.local`)，确保请求能成功跑通。
* **Day 3: 引入 Vercel AI SDK 与流式输出 (Streaming)**
  * 安装 `@ai-sdk/openai` 和 `ai` (Vercel AI SDK 主包)。
  * 重构 Route Handler，使用 `streamText` 实现服务端流式返回。
  * 在前端使用 `useChat` hook 替换手写的 fetch 逻辑，实现打字机效果。
* **Day 4: 消息状态管理与 UI 完善**
  * 区分 User 和 Assistant 的消息气泡样式。
  * 处理发送中的 Loading 状态、禁用输入框防抖处理。
  * 实现对话框的“自动滚动到底部”机制。
* **Day 5: 错误处理与容灾**
  * 在 `useChat` 中处理 API 超时或 Token 耗尽的异常回调 (`onError`)。
  * 在界面上友好地展示错误信息，并提供“重试”按钮。
* **Day 6-7: 缓冲日**
  * 整理第一周代码，确保 MVP 在本地稳健运行，梳理不理解的 API 文档。

### 第二周 (Week 2)：Prompt 工程与定制化写作能力
目标：让这个产品从“套壳 ChatGPT”变成一个“专业写作助手”，通过 UI 控制 Prompt。

* **Day 1: System Prompt 动态构建**
  * 在前端增加侧边栏配置面板：添加“角色设定”下拉框（如：专业撰稿人、社媒运营、学术研究员）。
  * 将用户的配置项作为附带数据 (`body`) 传给后端的 API 路由。
* **Day 2: 细粒度写作控制项开发**
  * 在配置面板新增控制项：“语气 (Tone)”（正式/幽默/严肃）和“长度 (Length)”（简短/详尽）。
  * 后端根据传入的参数，动态拼接出强大的 System Prompt。
* **Day 3: Markdown 渲染集成**
  * 安装 `react-markdown` 及其常用插件（`remark-gfm` 等）。
  * 将 AI 返回的纯文本流渲染成排版精美的 Markdown，支持标题、列表、加粗等格式。
* **Day 4: 代码高亮支持 (可选，如果涉及技术写作)**
  * 引入 `react-syntax-highlighter`。
  * 为 Markdown 渲染器编写自定义规则，让代码块具备语法高亮。
* **Day 5: 单文本快捷操作 (Quick Actions)**
  * 在 AI 回复的消息气泡下方添加快捷操作按钮：“扩写 (Expand)”、“缩写 (Summarize)”、“润色 (Polish)”。
  * 点击时触发特定的隐藏 Prompt 请求，只针对当前选中的文本进行处理。
* **Day 6-7: 缓冲日**
  * 测试各种 Prompt 组合的效果，微调 System Prompt 以达到最佳的生成质量。

### 第三周 (Week 3)：高阶交互、持久化与产品上线
目标：补齐 AI 产品的最后一块拼图，完成工程化闭环并上线部署。

* **Day 1: AI 交互进阶控制**
  * 利用 `useChat` 提供的能力，实现“停止生成 (Stop)”功能（打断流式输出）。
  * 实现“重新生成 (Regenerate)”最后一条回复的功能。
  * 实现“一键复制” AI 回复的功能。
* **Day 2: 会话历史本地持久化 (Local Storage)**
  * 利用 `localStorage` 或前端轻量数据库 (如 `idb-keyval`) 保存对话记录。
  * 刷新页面后能恢复之前的对话状态（初阶不需要搞数据库，降低复杂度）。
* **Day 3: 多会话管理 (Sessions)**
  * 实现侧边栏的“新建对话”、“删除对话”功能。
  * 在不同的历史对话之间切换，并正确更新主界面的 `messages` 状态。
* **Day 4: Vercel 部署与生产环境配置**
  * 将代码推送到 GitHub。
  * 在 Vercel 上导入项目，配置生产环境的 API Keys。
  * 验证生产环境下的流式输出是否正常，解决可能存在的 Edge Runtime 兼容性问题。
* **Day 5: 项目复盘与简历素材沉淀**
  * 编写项目级别的 `README.md`（包含架构图、核心技术栈、效果截图）。
  * 提炼简历上的亮点（例如：“使用 Vercel AI SDK 实现毫秒级首字响应”、“基于动态 System Prompt 设计了灵活的模板化生成引擎”）。
* **Day 6-7: 缓冲日 & 庆祝**
  * 你已经拥有了一个完整的全栈 AI 作品集！分享给朋友，准备迎接第二阶段。

---

## 🛠️ 技术栈推荐清单
- **框架:** Next.js (App Router), React 18
- **语言:** TypeScript
- **AI 框架:** Vercel AI SDK (`ai`, `@ai-sdk/openai`)
- **UI & 样式:** Tailwind CSS, shadcn/ui, Lucide React (图标)
- **其他:** `react-markdown`, `clsx`, `tailwind-merge`