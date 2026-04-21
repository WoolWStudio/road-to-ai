# 第二阶段：支持文档解析的知识库系统 (第 4-7 周)

在本阶段，我们将从零开始，构建一个功能完备的 RAG (Retrieval-Augmented Generation) 应用。用户可以上传自己的文档（如 PDF），然后像聊天一样向文档提问。这个项目将让你掌握大模型处理私有数据的核心技术，是 AI 应用工程师的必备技能。

## 🎯 核心聚焦点

- **向量数据库 (Vector Database)**：理解 Embeddings 的概念，并使用 Vercel Postgres (pgvector) 或其他向量数据库进行数据存储与检索。
- **RAG 工作流 (RAG Workflow)**：掌握“解析-分块-向量化-存储-检索-生成”的完整 RAG 链路。
- **文件处理**: 实现前端上传、后端解析 PDF/TXT 文档，并进行文本分块 (Chunking)。
- **Tool Use / Function Calling**: 学习使用 Vercel AI SDK 的 `generateObject`，让 AI 智能决定何时以及如何查询知识库。

---

## 📅 具体到天的代码行动指南

> **项目启动提示**：可以将第一阶段的项目 `phase1-ai-writing-assistant` 复制一份作为本项目的基础，这样可以复用大部分 UI 和聊天逻辑。

### 第四周 (Week 4)：RAG 基础与向量数据库

目标：打通“文档解析 -> 向量化 -> 存入数据库 -> 相似度搜索”的核心数据链路。

- **Day 1: 项目初始化与文档上传 UI**
  - 复制第一阶段项目，并清理掉与写作助手相关的特定逻辑（如角色、语气设定）。
  - 在界面上增加一个“知识库管理”区域，包含一个文件上传组件。
  - 使用 `react-dropzone` 或原生 `<input type="file">` 实现文件上传的 UI。
- **Day 2: 后端文档解析与分块 (Chunking)**
  - 创建一个新的 API Route (e.g., `app/api/documents/route.ts`) 用于接收上传的文档。
  - 安装 `pdf-parse` 库，在后端实现从 PDF 文件中提取纯文本内容。**注意**：此库无法处理扫描版（图片）PDF，如果遇到解析瓶颈，可考虑直接使用 LLM 原生的文档理解能力或接入 OCR 服务。
  - 实现一个简单的文本分块函数，将长文本切分成带有重叠部分 (overlap) 的小块 (chunks)。
- **Day 3: Embeddings 与向量数据库**
  - 选择向量数据库：使用 **Vercel Postgres**。它与 Vercel 平台无缝集成，能最大程度节约环境配置时间。在 Vercel Dashboard 中一键创建并启用 `pgvector` 扩展。
  - 在后端 API 中，使用 `@ai-sdk/openai` 的 `embed` 函数创建向量。**免费额度提示**：为了不超出 Vercel Postgres 的存储/写入限制以及 OpenAI API 的扣费，开发跑通链路期间，请**严格使用小文件（如几段话的 txt 或单页 PDF）**进行测试。
  - 学习如何将文本块内容及其对应的向量存入你的向量数据库。
- **Day 4: 实现向量检索 (Retrieval)**
  - 在聊天 API (`app/api/chat/route.ts`) 中，接收用户问题。
  - 对用户问题本身也进行向量化，生成一个 query vector。
  - 查询向量数据库，执行相似度搜索，找出与问题向量最相似的 N 个文本块作为“上下文 (Context)”。
- **Day 5: 朴素 RAG 对话**
  - 将上一步检索到的上下文，拼接到一个 System Prompt 中。例如：“请根据以下上下文来回答用户的问题。上下文：{...retrieved_chunks}”。
  - 将拼接好的 Prompt 和用户问题一起发送给 LLM，并将模型的回答流式返回给前端。
  - 完成一个最基础的、端到端的 RAG 对话测试。
  - **建立基准测试 (Evals 提前)**：跑通基础链路后，马上建立一个包含 10-20 条问答对的测试集，边开发边测，尽早发现分块或检索的潜在问题。
- **Day 6-7: 缓冲日**
  - 复习 Embeddings、向量相似度（余弦相似度）等核心概念。梳理代码，确保数据流转正确无误。

### 第五周 (Week 5)：Tool Use 与智能 RAG

目标：从“手动拼接 Prompt”升级为由 AI 决定何时检索的“智能 RAG”模式。

- **Day 1: 学习 Vercel AI SDK 的 Tools**
  - 阅读 Vercel AI SDK 关于 `tools` 和 `generateObject` 的官方文档。
  - 理解其工作原理：让 LLM 根据对话上下文，决定是否需要调用一个你定义的工具（如 `searchKnowledgeBase`）。
- **Day 2: 定义知识库检索 Tool**
  - 在聊天 API 中，使用 `streamText` 或 `streamObject`，并定义一个 `searchKnowledgeBase` tool。
  - 这个 tool 接收一个 `query` 字符串作为参数，其功能就是我们上周实现的“向量检索”逻辑。
- **Day 3: 后端 Tool 调用流程重构**
  - 重构聊天 API。当用户提问时，让 LLM 先做判断：
    - 如果问题与知识库相关，LLM 会决定调用 `searchKnowledgeBase` tool。
    - API 执行该 tool（进行向量搜索），并将结果返回给 LLM。
    - LLM 根据工具返回的上下文，生成最终答案。
- **Day 4: 前端 UI 适配 Tool 状态**
  - `useChat` hook 对 tool calling 有很好的支持。
  - 在前端展示 tool 的中间状态，例如当 AI 决定搜索时，可以在界面上显示一个提示：“正在知识库中搜索‘xxx’...”。
- **Day 5: 引用与溯源 (Citations)**
  - 在 `searchKnowledgeBase` tool 返回的结果中，不仅包含文本块内容，还要包含其元数据（如来源文档名、页码等）。
  - 在 AI 的最终回复下方，展示引用来源，让用户可以追溯信息的出处。这是 RAG 系统非常重要的一个信任增强功能。
- **Day 6-7: 缓冲日**
  - 对比朴素 RAG 和 Tool-based RAG 的优劣。测试不同类型的问题，观察 AI 是否能准确地决定何时使用工具。

### 第六周 (Week 6)：多文档管理与产品化

目标：将应用从单文档原型扩展为支持多文档管理的知识库产品。

- **Day 1: 多文档数据模型**
  - 在数据库中设计新的表结构，用于管理文档信息（如 `id`, `fileName`, `userId`, `uploadStatus` 等）。
  - 在存储向量时，为每个向量块增加 `document_id` 的元数据。
- **Day 2: 文档管理 UI 与 API**
  - 实现“知识库管理”界面的功能：展示已上传的文档列表、上传状态、删除文档等。
  - 编写对应的后端 API 来处理这些 CRUD 操作。删除文档时，要确保其关联的向量也被一并清除。
- **Day 3: 限定范围的对话 (Scoped Chat)**
  - 在聊天界面中，允许用户选择是在“所有文档”中提问，还是针对“某个特定文档”提问。
  - 改造 `searchKnowledgeBase` tool，使其可以接收一个可选的 `documentId` 参数，以实现范围限定的向量搜索。
- **Day 4: 对话历史与上下文隔离**
  - 实现多会话管理（复用或参考第一阶段的逻辑）。
  - 确保每个会话的上下文是隔离的。特别是当用户切换不同文档进行对话时，历史消息不应互相干扰。
- **Day 5: 优化与边界处理**
  - 处理文档上传失败、解析失败等异常情况，并给与用户友好的提示。
  - 思考并优化分块策略 (Chunking Strategy)：不同的块大小和重叠，对检索效果有什么影响？
- **Day 6-7: 缓冲日**
  - 对整个应用进行压力测试，上传一些较大的 PDF，观察处理速度和检索质量。

### 第七周 (Week 7)：评估、部署与复盘

目标：完成项目的最终打磨，部署上线，并为面试做好准备。

- **Day 1: 简单的 RAG 评估 (Evals)**
  - **理论学习**：了解 RAG 评估的几个核心指标：`Answer Relevancy` (答案相关性), `Faithfulness` (忠实度), `Context Precision` (上下文精确度)。
  - **系统化评估**：基于第四周提前建立的测试集，使用更系统的方法对比不同分块策略（Chunking Strategy）和 Prompt 对最终指标的影响。
- **Day 2: 添加流式 UI 交互**
  - 将第一阶段的成熟交互（停止生成、重新生成、复制）应用到当前项目中。
- **Day 3: Vercel 生产环境部署**
  - 将代码推送到 GitHub。
  - 在 Vercel 上导入项目，配置生产环境的数据库连接信息和 API Keys。
  - 验证生产环境的文档上传、RAG 对话流程是否全部正常。
- **Day 4: 编写项目 README.md**
  - 为本项目撰写一份高质量的 `README.md`。
  - 绘制一张 RAG 架构图，清晰地展示数据流和技术选型。
  - 附上效果截图或 GIF 动图。
- **Day 5: 简历素材沉淀与面试准备**
  - 提炼简历亮点：例如“基于 Vercel AI SDK 和 pgvector 构建了端到端的 RAG 知识库问答系统”、“利用 Tool Use 实现了智能检索，提升了问答的灵活性和准确性”。
  - 准备面试中可能被问到的问题：RAG 的瓶颈是什么？如何评估 RAG 的效果？分块策略如何选择？
- **Day 6-7: 缓冲日 & 庆祝**
  - 你现在拥有了第二个更具深度的 AI 全栈作品！准备迎接第三阶段的挑战。**前瞻提示**：如果下一阶段引入 Python/FastAPI 跨度太大，可先用 Next.js 的 Route Handler 跑通所有后端逻辑，将 Python 作为进阶加分项。
