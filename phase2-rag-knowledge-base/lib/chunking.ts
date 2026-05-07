// 优化的文本分块函数 (带有语义感知能力的切片)
// chunkSize: 每个文本块的最大长度
// chunkOverlap: 块与块之间的重叠字数，防止关键信息刚好在切分边缘被截断
export function chunkText(text: string, chunkSize = 500, chunkOverlap = 100) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = i + chunkSize;

    // 💡 优化：不要在句子中间硬切。如果还没到文件尾，尝试向回寻找最近的标点符号
    if (end < text.length) {
      const breakPoint = Math.max(
        text.lastIndexOf("。", end),
        text.lastIndexOf("！", end),
        text.lastIndexOf("？", end),
        text.lastIndexOf(".", end),
        text.lastIndexOf("\n", end),
      );

      // 如果在当前块的后半部分（重叠区以内）找到了标点，就完美地在标点处切断
      if (breakPoint > i + chunkSize - chunkOverlap) {
        end = breakPoint + 1;
      }
    }

    const chunk = text.slice(i, end).trim();
    if (chunk) chunks.push(chunk);

    i = end - chunkOverlap;
  }
  return chunks;
}
