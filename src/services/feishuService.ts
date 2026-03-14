import { CONFIG } from '../config';
import { MOCK_QUESTIONS } from '../constants';
import { FeishuRecord, Question } from '../types';

/**
 * Transforms raw Feishu record to our Question type
 */
const transformRecord = (record: FeishuRecord): Question => {
  return {
    id: record.record_id,
    code: record.fields["题目编号"] || 'N/A',
    status: record.fields["发布状态"],
    major: record.fields["适用专业"],
    title: record.fields["文章标题"],
    content: record.fields["题目内容"],
    analysis: record.fields["参考思路"],
    link: record.fields["原文链接"],
    // Use actual field if available, otherwise use mock/simulated text as requested
    originalText: record.fields["原文内容"] || generateMockOriginalText(record.fields["文章标题"] || "Unknown Topic"),
    // Feishu date field is named "日期" and is a timestamp (number). Convert to standard format YYYY-MM-DD
    // Fallback to "迭代日期" if "日期" is missing, just in case.
    iterationDate: (record.fields["日期"] || record.fields["迭代日期"]) 
      ? new Date(record.fields["日期"] || record.fields["迭代日期"]).toISOString().slice(0, 10) 
      : undefined,
    // Use system-level last_modified_time
    updatedAt: record.last_modified_time || Date.now(),
  };
};

/**
 * Helper to generate simulated original text if missing
 */
const generateMockOriginalText = (title: string): string => {
  return `【模拟原文】关于“${title}”的深度报道\n\n` +
         `（注：由于原数据中暂无“原文内容”字段，此处为自动生成的占位文本，用于展示分栏阅读效果。）\n\n` +
         `随着全球经济一体化的深入发展，金融市场的波动日益受到关注。本文旨在探讨近期市场热点背后的深层逻辑。\n\n` +
         `第一，宏观经济环境的变化是不可忽视的因素。无论是货币政策的调整，还是财政政策的转向，都对资本市场产生了深远影响。投资者应当密切关注央行的动向，以及各项经济指标的发布。\n\n` +
         `第二，行业基本面的改善是支撑股价上涨的关键。在科技创新和产业升级的推动下，许多新兴行业展现出了强劲的增长势头。与此同时，传统行业也在通过数字化转型寻求新的突破。\n\n` +
         `第三，风险管理的重要性日益凸显。在不确定的市场环境中，如何有效识别和防范风险，是每一个市场参与者必须面对的课题。建立多元化的投资组合，利用衍生品工具进行对冲，都是行之有效的策略。\n\n` +
         `综上所述，面对复杂多变的金融市场，我们需要保持冷静的头脑，坚持价值投资的理念，不断学习和适应新的变化。只有这样，才能在激烈的竞争中立于不败之地。`;
};

export interface FetchQuestionsResult {
  questions: Question[];
  hasMore: boolean;
  pageToken?: string;
}

/**
 * Fetches questions from our local backend proxy
 */
export async function fetchQuestions(mode: 'random', pageToken?: string, subject?: string): Promise<Question[]>;
export async function fetchQuestions(mode: 'all', pageToken?: string, subject?: string): Promise<FetchQuestionsResult>;
export async function fetchQuestions(mode?: 'all' | 'random', pageToken?: string, subject?: string): Promise<FetchQuestionsResult | Question[]>;
export async function fetchQuestions(
  mode: 'all' | 'random' = 'all', 
  pageToken?: string,
  subject?: string
): Promise<FetchQuestionsResult | Question[]> {
  
  if (CONFIG.USE_MOCK_DATA) {
    console.log("Using Mock Data (forced via config)");
    await new Promise(resolve => setTimeout(resolve, 800));
    // Mock data doesn't support pagination properly in this simplified version
    return mode === 'random' ? getMockData(mode) : { questions: await getMockData(mode), hasMore: false };
  }

  try {
    // Construct URL with pagination parameters
    let url = `${CONFIG.API_BASE_URL}/questions?page_size=20`;
    if (pageToken) {
      url += `&page_token=${pageToken}`;
    }

    // Call our local Node.js proxy using the relative path defined in config.ts
    const response = await fetch(url);
    
    // If the proxy is not running, this might return HTML (the React app itself) or 504/502
    // We check content-type to ensure we got JSON
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error(`Backend unavailable or returned non-JSON. Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items) {
      throw new Error("Invalid data format from backend");
    }

    const rawRecords: FeishuRecord[] = data.items;

    // Process Data (Filtering logic stays in frontend for simplicity)
    let questions = rawRecords.map(transformRecord);

    console.log("Raw questions from Feishu:", questions);
      
    // Filter for published finance questions
    /* 
    questions = questions.filter(q => {
        const isPublished = q.status === "已发布" || q.status === "Published";
        const isFinance = q.major === "金融" || q.major === "Finance";
        return isPublished && isFinance;
    });
    */
   
    // Apply subject filtering if provided
    if (subject) {
      questions = questions.filter(q => {
        // Normalize subject check (handle both Chinese and English if needed)
        const major = q.major || '';
        if (subject === 'Finance') {
          return major.includes('金融') || major.includes('Finance');
        } else if (subject === 'Journalism') {
          return major.includes('新传') || major.includes('Journalism');
        }
        return true;
      });
    }

    console.log("Filtered questions:", questions);

    if (mode === 'random') {
      // Fisher-Yates shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      return questions.slice(0, 10);
    } else {
      // Sort by Updated Time Descending
      questions.sort((a, b) => b.updatedAt - a.updatedAt);
      
      return {
        questions,
        hasMore: data.has_more,
        pageToken: data.page_token
      };
    }

  } catch (error) {
    // We suppress the loud error here because fallback is expected behavior if the backend isn't running
    console.warn("Backend connection failed, falling back to mock data. (Ensure 'npm run server' is active for live data)");
    return mode === 'random' ? getMockData(mode) : { questions: await getMockData(mode), hasMore: false };
  }
};

// Helper for fallback mock data
function getMockData(mode: 'all' | 'random'): Question[] {
    let data = [...MOCK_QUESTIONS];
    data = data.filter(q => q.status === "已发布" && q.major === "金融");

    if (mode === 'random') {
      return data.sort(() => 0.5 - Math.random()).slice(0, 10);
    } else {
      return data.sort((a, b) => b.updatedAt - a.updatedAt);
    }
}