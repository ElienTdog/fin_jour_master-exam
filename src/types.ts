export interface FeishuFields {
  "题目编号"?: string;
  "发布状态"?: string;
  "适用专业"?: string;
  "文章标题"?: string;
  "题目内容"?: string;
  "参考思路"?: string;
  "原文链接"?: string;
  "原文内容"?: string; // New field
  "迭代日期"?: string; // New field: Iteration Date (e.g., "2026-01")
  [key: string]: any;
}

export interface FeishuRecord {
  record_id: string;
  fields: FeishuFields;
  last_modified_time?: number; 
}

// Clean internal type for usage in components
export interface Question {
  id: string;
  code: string;
  status?: string;
  major?: string;
  title: string;
  content: string;
  analysis: string;
  link?: string;
  originalText?: string; // New field
  iterationDate?: string; // New field
  updatedAt: number;
}