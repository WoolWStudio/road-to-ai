# RAG 与 AI 全栈工程实践总结 (Week 4 - Week 6)

本文档总结了在构建“支持文档解析的知识库系统”期间的核心技术点、架构设计思路以及工程化最佳实践，方便后续查阅与系统设计面试复习。

---

## 1. RAG (检索增强生成) 基础链路

RAG 的本质是**“给大模型外挂一个只读的本地硬盘”**，解决大模型知识滞后和缺乏企业私有数据的问题。

### 1.1 标准数据流

1. **解析 (Parse)**：提取 TXT/PDF/Word 等文件中的纯文本内容。
2. **分块 (Chunking)**：将长文本切分成适合大模型上下文窗口的小块。
3. **向量化 (Embedding)**：通过模型（如 `text-embedding-3-small`）将文本转换为高维浮点数数组。
4. **存储 (Store)**：将文本块及其对应的向量存入向量数据库（如 Vercel Postgres + `pgvector`）。
5. **检索 (Retrieve)**：将用户问题也向量化，利用“余弦相似度”在数据库中找出最相关的文本块。
6. **生成 (Generate)**：将检索到的文本块作为 Context 塞入 Prompt，让 LLM 归纳回答。

### 1.2 语义感知分块策略 (Semantic-aware Chunking)

朴素的滑动窗口切片容易在句子中间生硬切断，导致向量语义丢失。
**最佳实践**：向回寻找标点符号，确保在完整句子的末尾进行切断，同时保留一定的重叠区（Overlap）以防止上下文断层。

```typescript
// lib/chunking.ts
export function chunkText(text: string, chunkSize = 500, chunkOverlap = 100) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = i + chunkSize;
    if (end < text.length) {
      // 尝试在重叠区内寻找最近的标点符号，进行完美切断
      const breakPoint = Math.max(
        text.lastIndexOf("。", end),
        text.lastIndexOf("\n", end),
      );
      if (breakPoint > i + chunkSize - chunkOverlap) end = breakPoint + 1;
    }
    const chunk = text.slice(i, end).trim();
    if (chunk) chunks.push(chunk);
    i = end - chunkOverlap;
  }
  return chunks;
}
```

---

## 2. 向量数据库与高并发写入

### 2.1 关系型 + 向量架构

在实际产品中，不能只有单一的 `document_chunks` 表，必须要有主表进行元数据管理，这是多文档隔离的基础。
**最佳实践**：使用 `ON DELETE CASCADE`，将数据一致性问题交给数据库引擎解决。

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL
);

CREATE TABLE document_chunks (
  id SERIAL PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_content TEXT,
  embedding vector(1536)
);
```

### 2.2 性能优化：分批并发写入 (Batch Processing)

长文档会产生上千个 Chunk，不能用 `for` 循环串行插入（太慢），也不能直接 `Promise.all` 毫无限制地并发（会撑爆 Serverless 数据库连接池）。
**最佳实践**：设置 `BATCH_SIZE` 进行分批并发。

```typescript
// app/api/documents/route.ts
const BATCH_SIZE = 50;
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batchPromises = chunks.slice(i, i + BATCH_SIZE).map((chunk, index) => {
    const globalIndex = i + index;
    const embeddingString = `[${embeddings[globalIndex].join(",")}]`;
    return sql`
      INSERT INTO document_chunks (document_id, file_name, chunk_content, embedding)
      VALUES (${documentId}, ${file.name}, ${chunk}, ${embeddingString})
    `;
  });
  await Promise.all(batchPromises); // 每次安全并发 50 个连接
}
```

---

## 3. Tool Calling 与智能 RAG

摒弃“每次提问都无脑查数据库”的朴素 RAG 模式，利用 LLM 的 Function Calling 能力，让 AI 根据对话上下文**自主决定**是否需要检索。

### 3.1 动态上下文注入 (高阶函数模式)

为了支持限定范围的对话（Scoped Chat），Tool 的定义不能是静态的，而应该是一个接收上下文（如 `documentId`）的高阶函数。

```typescript
// lib/tools.ts
export const buildTools = (documentId?: string) => ({
  searchKnowledgeBase: tool({
    description: "当用户的问题可能需要参考知识库文档时，调用此工具进行检索。",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      // ...获取 query 的 embedding...

      // 动态拼接 SQL 以支持多文档隔离
      if (documentId) {
        return await sql`
          SELECT file_name, chunk_content, 1 - (embedding <=> ${emb}::vector) AS similarity
          FROM document_chunks WHERE document_id = ${documentId}
          ORDER BY similarity DESC LIMIT 3
        `;
      }
      // ...
    },
  }),
});
```

### 3.2 溯源 UI (Citations)

建立用户信任的关键。利用 Vercel AI SDK 的状态机，在前端拦截 `output-available` 状态，并提取源文件名。

```tsx
// components/ToolInvocations.tsx
const isDone = part.state === "output-available";
if (isDone && toolName === "searchKnowledgeBase") {
  const toolResult = part.output as PartOutput;
  if (toolResult.found) {
    const fileNames = Array.from(
      new Set(toolResult.sources.map((s) => s.fileName)),
    );
    // 渲染如: [📄 bp.txt] 的徽章
  }
}
```

---

## 4. 产品级体验优化

### 4.1 防止幻觉 (Hallucination Prevention)

如果检索不到内容，大模型极易利用其内部训练数据胡编乱造。
**防线**：在 System Prompt 中下达严厉的指令约束。

```typescript
// app/api/chat/route.ts
systemPrompt += `
【重要指令】
1. 如果调用了工具，请在回答末尾使用 Markdown 脚注语法标注来源（例如：[^1]: bp.txt）。
2. 如果工具返回未找到结果，你必须明确回答“在当前文档中未找到相关信息”，绝对不能使用内部知识解答，防止产生幻觉。
`;
```

### 4.2 错误处理与 UI 一致性

- API 接口严格使用 `Zod` 进行 Schema 验证。
- 捕获 `z.ZodError` 后，使用 `error.errors[0].message` 返回人类可读的报错。
- 全局状态（如当前选中的 `documentId`）与持久化的 `Session` 对象绑定，实现会话级别的上下文记忆。

---

## 5. System Design 面试亮点提炼

如果你在面试中谈及此项目，以下是能体现资深工程能力的亮点：

1. **数据一致性 (Data Consistency)**：将主表记录的插入延后到 `embedMany` 第三方 API 调用成功之后，防止产生孤立的“脏记录”。
2. **资源保护 (Connection Pool Safe)**：没有无脑使用 `Promise.all` 插入数据，而是设计了批处理 (Batch Processing) 机制，保障 Serverless Postgres 的连接池安全。
3. **防御性编程 (Defensive Programming)**：后端所有输入口（聊天、上传、删除）均受 `Zod` 守护；API 和 Prompt 双管齐下，有效控制了大模型发生幻觉的边界场景。

---

## 6. 高阶检索策略 (Advanced Retrieval Strategies)

朴素的向量检索（Dense Retrieval）在处理专有名词、产品型号或特定编号时往往效果不佳。完整的 RAG 系统通常需要更复杂的检索流水线。

### 6.1 混合检索 (Hybrid Search)

单纯的向量相似度会丢失字面精准匹配的能力。
**最佳实践**：结合传统的关键词检索（如 BM25 算法）与向量检索。在数据库查询时，双路召回（Two-tower Retrieval）结果，利用 RRF（Reciprocal Rank Fusion，倒数排名融合）算法对两路结果进行加权重新打分，从而兼顾“语义相关”与“字面精准”。

### 6.2 重排序 (Reranking)

向量数据库为了保证千万级数据的检索速度，使用的余弦相似度计算是相对粗糙的。
**最佳实践**：采用粗排 + 精排架构。先通过向量库召回 Top-20 的粗略结果，然后将这些 Chunk 和用户的 Query 一起送入轻量级的交叉编码器模型（Cross-Encoder，如 `bge-reranker`），计算出更精确的相关性分数并重新排序，最后只取 Top-5 喂给大模型。

### 6.3 查询重写 (Query Transformation)

用户在多轮对话中的提问往往是极其简短和缺乏上下文的（例如：“那它的原理是什么？”）。直接拿这种口语化问题去向量化，根本查不到内容。
**最佳实践**：在 Tool Calling 执行检索前，先利用 LLM 的能力，结合历史会话（Chat History），将用户的模糊提问改写为独立的、信息完整的查询语句（Standalone Query），然后再进行向量化。

---

## 7. 复杂文档解析与结构感知 (Advanced Parsing)

纯文本处理（TXT）是最基础的，但企业真实数据通常是复杂的 PDF、带有表格的 Word 或 HTML。

### 7.1 表格与多模态解析

标准的文本分块会直接把 PDF 里的表格切碎，导致行列关系完全丢失。
**最佳实践**：引入版面分析（Layout Analysis）工具。遇到表格时，将其转换为 Markdown 格式或 HTML 表格标签后再进行 Embedding；遇到图表时，可调用视觉模型（如 GPT-4o 视觉能力）生成图片摘要文本，再进行向量化存储。

### 7.2 父子文档切分 (Parent-Child Chunking)

为了检索精准，分块需要尽量小（如 200 字）；但为了给 LLM 提供充足上下文，塞入 Prompt 的块又需要比较大。
**最佳实践**：在数据库中建立父子级联关系。切分小 Chunk 进行向量化以提升命中率，但在组装最终 Context 时，顺藤摸瓜取出该小 Chunk 所属的大片段（父文档）交给大模型。

---

## 8. RAG 系统的评估体系 (Evaluation Framework)

在工程实践中，“我觉得回答得不错”是无法迭代系统的。面试官非常看重你如何量化 RAG 系统的表现。

### 8.1 引入 RAGAS 评估指标

不能只凭感觉（Vibes）看最终生成的回答，需要将 RAG 拆解为“检索 (Retrieval)”和“生成 (Generation)”两部分进行独立评估。业界常使用 RAGAS 或 TruLens 等评估框架。

**三大核心量化指标**：

1. **Context Precision (上下文精确度) - 评估检索器**
   - **核心问题**：数据库找出来的文本块准不准？有用的信息是不是排在最前面？
   - **概念**：衡量召回的 Chunk 中，真正包含答案的 Chunk 是否排在最前。大模型有“迷失在中间”的通病，如果前几个 Chunk 都是无关噪音，AI 极易被误导。

2. **Faithfulness (忠实度 / 无幻觉率) - 评估生成器**
   - **核心问题**：大模型的回答是不是 100% 严格基于检索出的上下文？
   - **概念**：专门用于检测幻觉 (Hallucination)。将最终答案拆解为多句陈述，检查是否每一句都能从检索到的 Chunk 中推导出来。在企业知识库中，宁愿 AI 回答“未找到相关信息”，也绝对不能瞎编。

3. **Answer Relevancy (答案相关性) - 评估端到端系统**
   - **核心问题**：最终的回答是不是直接、精准地解答了用户的提问？
   - **概念**：衡量“答”与“问”的匹配度。即使检索很准 (High Precision)、回答也很忠实 (High Faithfulness)，但如果长篇大论答非所问，用户体验依然很差。

**💡 工业界自动化测试 (LLM-as-a-Judge)**：
面对成百上千道测试题，人工打分是不现实的。目前的最佳实践是使用一个参数量更大、更聪明的模型（如 GPT-4o 或 Claude 3.5 Sonnet）作为“裁判 (Judge)”，通过特定的 Prompt 自动化运行测试集并为上述指标打分。

---

### 8.2 创建基准测试集 (Golden Set)

为了进行量化评估，必须首先创建一个“黄金标准”测试集。这个测试集通常是一个 JSON 文件，包含一系列的问答对。
**最佳实践**：测试集应覆盖多种问题类型，包括事实查找、归纳总结、以及**文档中不存在答案**的“负面测试”（用于检测幻觉）。

```json
// evals/basic-eval-set.json
[
  {
    "question": "What is the company's primary product?",
    "ideal_answer": "The company's primary product is an AI-powered writing assistant platform...",
    "contexts": [
      "Project 'Phoenix' is our flagship product, an advanced AI-powered writing assistant..."
    ]
  }
]
```

这个文件是所有 RAG 优化的基石。每当你调整分块策略、Prompt 或 Reranking 模型时，都应该用这个测试集跑一遍，用数据来证明你的改动是正向的。

## 9. 生产环境的成本与安全兜底 (Cost & Security)

### 9.1 语义缓存 (Semantic Caching)

对于高频相似问题（如“你们的退款政策是什么？”和“我要怎么退钱？”），每次都重新计算 Embedding、查库、调用大模型生成，成本极高且响应慢。
**最佳实践**：在前端请求和 RAG 核心逻辑之间架设一层语义缓存（如 Redis + 简单的轻量级向量对比）。当新问题的向量与缓存库中已有问题的向量相似度高于 0.95 时，直接返回历史生成的答案。

### 9.2 数据隔离与权限控制 (RBAC)

在多租户系统或企业内部系统中，不同用户对文档的可见权限是不同的。
**最佳实践**：在 `document_chunks` 表中增加 `tenant_id` 或 `access_level` 等元数据（Metadata）。在构建动态 SQL 或向量检索过滤条件时，必须将用户的身份令牌（Token）中的权限等级作为硬性过滤条件（Pre-filtering），防止越权访问机密文档。
