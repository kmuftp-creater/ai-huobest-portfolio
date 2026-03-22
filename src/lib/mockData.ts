// Mock data for development — will be replaced with Supabase queries

export interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  techTags: string[];
  demoUrl: string;
  sourceUrl: string;
  features: string[];
  techDetails: string;
  overview: string;
  createdAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  description: string;
  category: 'analysis' | 'strategy' | 'creation' | 'optimization';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  content: string;
  inputExample: string;
  outputExample: string;
  author: string;
  createdAt: string;
}

export interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  content: string;
  usageScenarios: string;
  source: string;
  howToUse: string;
  createdAt: string;
}

export interface Workshop {
  id: string;
  title: string;
  date: string;
  description: string;
  registrationUrl: string;
  content: string;
  imageUrl: string;
}

export interface SharedProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  content: string;
  createdAt: string;
}

export const mockProjects: Project[] = [
  {
    id: '1',
    title: 'AI 待辦事項管理器',
    description: '智能待辦事項應用，支援 AI 自動分類與優先級建議，具備完整的 CRUD 功能與資料持久化。',
    thumbnail: '',
    techTags: ['React', 'TypeScript', 'OpenAI API', 'LocalStorage'],
    demoUrl: 'https://demo.example.com/todo',
    sourceUrl: 'https://github.com/kmuftp/ai-todo',
    features: ['新增、編輯、刪除待辦事項', '分類管理', '優先級設定', '到期日提醒', 'LocalStorage 資料持久化', 'AI 智能分類建議'],
    techDetails: '使用 React 18 搭配 TypeScript 開發，透過 OpenAI API 實現智能分類功能。採用 Context API 管理全域狀態，LocalStorage 實現資料持久化。',
    overview: '一個結合 AI 功能的現代化待辦事項管理工具，幫助使用者更有效率地管理日常任務。',
    createdAt: '2025-12-15',
  },
  {
    id: '2',
    title: 'AI 圖片識別工具',
    description: '上傳圖片即可自動識別內容，支援多種物件辨識與場景分析。',
    thumbnail: '',
    techTags: ['Next.js', 'Python', 'TensorFlow', 'REST API'],
    demoUrl: 'https://demo.example.com/image-ai',
    sourceUrl: 'https://github.com/kmuftp/image-ai',
    features: ['圖片上傳與預覽', '物件辨識', '場景分析', '文字辨識 (OCR)', '支援多種圖片格式'],
    techDetails: '前端使用 Next.js，後端使用 Python Flask 搭配 TensorFlow 進行推論，透過 REST API 連接前後端。',
    overview: '利用深度學習模型實現的圖片識別工具，可辨識圖片中的物件、場景和文字。',
    createdAt: '2026-01-20',
  },
  {
    id: '3',
    title: 'ChatBot 智能客服',
    description: '基於 GPT 的智能客服系統，支援多輪對話、上下文記憶與知識庫查詢。',
    thumbnail: '',
    techTags: ['Vue.js', 'Node.js', 'OpenAI', 'MongoDB'],
    demoUrl: 'https://demo.example.com/chatbot',
    sourceUrl: 'https://github.com/kmuftp/chatbot',
    features: ['多輪對話', '上下文記憶', '知識庫查詢', '情緒分析', '多語言支援'],
    techDetails: '前端使用 Vue.js 3，後端使用 Node.js + Express，整合 OpenAI GPT API，對話歷史存儲於 MongoDB。',
    overview: '企業級智能客服解決方案，透過 AI 自動回答常見問題，提升客戶服務效率。',
    createdAt: '2026-02-10',
  },
];

export const mockPrompts: Prompt[] = [
  {
    id: '1',
    title: '產品需求分析提示詞',
    description: '幫助產品經理快速分析需求文件，提取關鍵功能點和優先級。',
    category: 'analysis',
    difficulty: 'intermediate',
    tags: ['產品', '需求分析', 'PRD'],
    content: `# 角色設定\n你是一位資深產品經理，擅長分析需求文件。\n\n# 任務\n請分析以下需求文件，並提供：\n1. 核心功能列表\n2. 功能優先級排序\n3. 技術可行性評估\n4. 潛在風險點\n\n# 輸出格式\n使用表格形式呈現，包含功能名稱、優先級（P0-P3）、技術難度、預估工時。`,
    inputExample: '請分析一個電商平台的需求文件，包含商品管理、訂單系統、會員系統等模組。',
    outputExample: '| 功能 | 優先級 | 難度 | 預估工時 |\n|------|--------|------|----------|\n| 商品管理 | P0 | 中 | 2週 |\n| 訂單系統 | P0 | 高 | 3週 |',
    author: 'admin',
    createdAt: '2026-02-01',
  },
  {
    id: '2',
    title: 'SEO 文章撰寫框架',
    description: '系統化生成高品質 SEO 友善文章的提示詞模板。',
    category: 'creation',
    difficulty: 'beginner',
    tags: ['SEO', '文案', '行銷'],
    content: `# 角色\n你是一位專業的 SEO 文案撰寫者。\n\n# 任務\n根據以下關鍵字撰寫一篇 SEO 友善的文章：\n- 標題包含主要關鍵字\n- 自然融入長尾關鍵字\n- 段落結構清晰\n- 加入 H2/H3 子標題\n- 字數 1500-2000 字\n\n# 注意事項\n- 避免關鍵字堆砌\n- 內容要有價值\n- 加入行動呼籲 (CTA)`,
    inputExample: '主要關鍵字：「AI 寫作工具」\n長尾關鍵字：「AI 寫作工具推薦」、「免費 AI 寫作」',
    outputExample: '# 2026 年最佳 AI 寫作工具推薦：提升效率的秘密武器\n\n在數位時代...(完整文章)',
    author: 'admin',
    createdAt: '2026-02-15',
  },
  {
    id: '3',
    title: '程式碼審查提示詞',
    description: '讓 AI 成為你的程式碼審查夥伴，找出潛在問題與優化建議。',
    category: 'optimization',
    difficulty: 'advanced',
    tags: ['程式設計', 'Code Review', '最佳實踐'],
    content: `# 角色\n你是一位資深軟體工程師，專門進行程式碼審查。\n\n# 審查重點\n1. **安全性**: SQL Injection、XSS、CSRF 等安全漏洞\n2. **效能**: 時間複雜度、空間複雜度、N+1 查詢\n3. **可維護性**: 命名規範、程式碼重複、SOLID 原則\n4. **測試覆蓋**: 單元測試完整性\n\n# 輸出格式\n- 🔴 嚴重問題\n- 🟡 需要改進\n- 🟢 建議優化\n- ✅ 良好實踐`,
    inputExample: '```javascript\napp.get("/user/:id", (req, res) => {\n  db.query("SELECT * FROM users WHERE id=" + req.params.id)\n})\n```',
    outputExample: '🔴 **嚴重：SQL Injection 漏洞**\n直接拼接 SQL 字串，應使用參數化查詢。',
    author: 'admin',
    createdAt: '2026-03-01',
  },
];

export const mockSkills: Skill[] = [
  {
    id: '1',
    title: 'AI 提示詞工程基礎',
    description: '學習如何撰寫有效的 AI 提示詞，提升 AI 輸出品質。',
    category: '教學輔助',
    difficulty: 'beginner',
    tags: ['Prompt Engineering', 'ChatGPT', '基礎'],
    content: `# 提示詞工程五大原則\n\n## 1. 明確角色設定\n告訴 AI 它扮演什麼角色。\n\n## 2. 具體任務描述\n清楚說明你要什麼。\n\n## 3. 提供上下文\n給予足夠的背景資訊。\n\n## 4. 指定輸出格式\n明確輸出的格式要求。\n\n## 5. 給予範例\n提供 Few-shot 範例幫助 AI 理解。`,
    usageScenarios: '適用於所有需要與 AI 對話的場景，特別是文案撰寫、程式開發、數據分析等。',
    source: 'OpenAI Best Practices',
    howToUse: '在撰寫提示詞時，依序考慮這五個原則，逐一填入相關資訊即可。',
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    title: 'Midjourney 進階參數',
    description: '掌握 Midjourney 的進階參數設定，生成更精準的 AI 圖片。',
    category: '創意發想',
    difficulty: 'intermediate',
    tags: ['Midjourney', 'AI 繪圖', '參數'],
    content: `# Midjourney 進階參數大全\n\n## 品質參數\n- \`--q 2\` 最高品質\n- \`--q 1\` 標準品質(預設)\n\n## 風格參數\n- \`--s 750\` 高風格化\n- \`--s 100\` 低風格化\n\n## 比例參數\n- \`--ar 16:9\` 寬螢幕\n- \`--ar 9:16\` 直式\n- \`--ar 1:1\` 正方形`,
    usageScenarios: '適用於需要生成高品質 AI 圖片的場景，如設計稿、概念圖、社群媒體素材等。',
    source: 'Midjourney Documentation',
    howToUse: '在 Midjourney 的 prompt 後方加上對應參數即可，例如：/imagine a cat --ar 16:9 --q 2',
    createdAt: '2026-01-25',
  },
];

export const mockWorkshops: Workshop[] = [
  {
    id: '1',
    title: 'AI 提示詞工程實戰工作坊',
    date: '2026-04-15',
    description: '一天深度學習 AI 提示詞撰寫技巧，從入門到進階，配合實際案例演練。',
    registrationUrl: 'https://forms.example.com/workshop-1',
    content: '本工作坊將帶領學員從零開始學習 AI 提示詞工程...',
    imageUrl: '',
  },
  {
    id: '2',
    title: 'ChatGPT 企業應用工作坊',
    date: '2026-05-20',
    description: '探索 ChatGPT 在企業場景中的應用，包括客服自動化、文件處理、數據分析等。',
    registrationUrl: 'https://forms.example.com/workshop-2',
    content: '企業如何有效導入 AI 工具提升生產力...',
    imageUrl: '',
  },
];

export const mockSharedProjects: SharedProject[] = [
  {
    id: '1',
    title: 'AI 文字轉語音工具',
    description: '將文字內容轉換為自然語音，支援多種語言和聲音風格。',
    imageUrl: '',
    linkUrl: 'https://tools.example.com/tts',
    content: '使用最新的 TTS 技術，提供高品質的語音合成服務。',
    createdAt: '2026-02-20',
  },
  {
    id: '2',
    title: 'Markdown 即時預覽編輯器',
    description: '支援即時預覽的 Markdown 編輯器，完整支援 GFM 語法。',
    imageUrl: '',
    linkUrl: 'https://tools.example.com/md-editor',
    content: '一個簡潔美觀的 Markdown 編輯器，支援即時預覽、匯出 PDF 等功能。',
    createdAt: '2026-03-05',
  },
];
