export type Session = {
  id: string;
  name: string;
  documentId?: string; // 记录该会话专属的检索范围
};

export type Document = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
};
