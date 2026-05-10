# 🧠 AI-Powered RAG Knowledge Base System

A production-ready Retrieval-Augmented Generation (RAG) system built with **Next.js 14**, **Vercel AI SDK**, and **pgvector**. This application allows users to upload documents, automatically processes them into semantic vector embeddings, and provides an intelligent, hallucination-free chat interface with source citations.


## ✨ Key Features

- 📝 **Automated Document Pipeline**: Upload `.txt` files to automatically parse, intelligently chunk (semantic-aware), and embed text using OpenAI's `text-embedding-3-small`.
- 🤖 **Tool-Augmented RAG**: Bypasses the naive "always-search" RAG approach. Uses LLM Function Calling to let the AI autonomously decide _when_ and _what_ to search.
- 🔍 **Vector Search via pgvector**: Utilizes Serverless Postgres with `pgvector` for fast, high-dimensional cosine similarity search.
- 🛡️ **Hallucination Prevention**: Strict prompt engineering enforces the LLM to reply "Information not found" instead of hallucinating when retrieval fails.
- � **Source Citations**: UI intercepts the Vercel AI SDK state machine to display trustworthy citation badges (e.g., `[📄 business_plan.txt]`).
- 📊 **Built-in Evals (Hit Rate)**: Includes an automated evaluation script to quantitatively measure retriever precision and context recall.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router), React, TypeScript
- **AI & LLM**: Vercel AI SDK (Core & UI), OpenAI APIs
- **Database**: Vercel Postgres, `pgvector`, `@vercel/postgres` (SQL)
- **Styling & UI**: Tailwind CSS, Base UI, `react-hot-toast`
- **Validation & Tooling**: Zod (Schema parsing), `tsx` (Eval execution)

## 🏗️ Architecture & Engineering Highlights

### 1. Semantic-aware Chunking

Naive sliding windows often cut sentences in half, destroying semantic meaning. Our `chunkText` utility performs backward lookups to find the nearest punctuation (`.` or `\n`), ensuring natural sentence boundaries while maintaining a healthy overlap to prevent context loss.

### 2. Connection Pool Safe Batch Processing

Processing a large document generates hundreds of chunks. To protect the Serverless Postgres connection pool from being overwhelmed, database insertions are handled via a strict `BATCH_SIZE` concurrent processing queue.

### 3. Dynamic Tool Context (Scoped Chat)

Tools are defined as higher-order functions (`buildTools(documentId)`). This enables multi-tenant data isolation and allows users to restrict the RAG search scope to a specific document or query the entire knowledge base globally.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Vercel Postgres Database (with `pgvector` extension enabled)
- OpenAI API Key

### Installation

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables. Create a `.env.local` file:

   ```env
   # LLM & Embedding provider
   OPENAI_API_KEY=sk-your-openai-api-key

   # Vercel Postgres Connection URL
   POSTGRES_URL="postgres://default:xxx@ep-xxx.postgres.vercel-storage.com:5432/verceldb"
   ```

3. Initialize the database schema:
   Execute the following SQL in your Vercel Postgres console:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;

   CREATE TABLE documents (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     file_name VARCHAR(255) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE document_chunks (
     id SERIAL PRIMARY KEY,
     document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
     chunk_content TEXT,
     embedding vector(1536)
   );
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to start chatting!

## 🧪 Running Evals (RAG Metrics)

You can't improve what you don't measure. This repository includes a "Golden Set" benchmark to evaluate the Retriever's performance (Context Precision / Hit Rate).

1. Upload the provided `business_plan.txt` via the UI.
2. Run the evaluation script:
   ```bash
   npx tsx evals/run-evals.ts
   ```
3. Review the terminal output to analyze Top-3 hit rates and cosine similarity scores.

---

