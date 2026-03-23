# Supabase 設定教學

本指南協助你完成「霍 の AI 腦洞實驗室」的後端環境設定。

---

## 步驟一：獲取憑證

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 前往左側選單最下方的 **Project Settings** (齒輪圖示)
4. 點擊 **API Keys**：
   * 點擊上面的分頁標籤 **「Legacy anon, service_role API keys」** 
   * 複製 **`anon`** (對應 `NEXT_PUBLIC_SUPABASE_ANON_KEY`) 與 **`service_role`** (對應 `SUPABASE_SERVICE_ROLE_KEY`) 這兩把金鑰。
5. 點擊左側選單的 **Data API** 或 **Configuration -> API**：
   * 找到並複製 **Project URL** (對應 `NEXT_PUBLIC_SUPABASE_URL`)。
6. 在專案根目錄的 `.env.local` 檔案中填入以下內容：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_ANON_KEY
# 僅限伺服器端，請勿外流
SUPABASE_SERVICE_ROLE_KEY=你的_SERVICE_ROLE_KEY
```

---

## ⚠️ SQL 重複執行說明（必讀）

每次執行升級 SQL 時，Supabase 可能會回報 `policy "xxx" already exists` 的錯誤。這是因為 `CREATE POLICY` **不支援** `IF NOT EXISTS`，只要 Policy 已存在就會報錯。

**本文件所有 SQL 皆已依照以下原則撰寫，可以安全地整段複製貼上、重複執行：**

| 物件類型 | 安全寫法 |
|---------|---------|
| 資料表 | `CREATE TABLE IF NOT EXISTS` |
| 欄位 | `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
| Policy | 先 `DROP POLICY IF EXISTS "名稱" ON 表名;` 再 `CREATE POLICY` |
| 函式 | `CREATE OR REPLACE FUNCTION`（自動覆蓋） |
| Index | `CREATE UNIQUE INDEX IF NOT EXISTS` |
| Constraint | `ALTER TABLE DROP CONSTRAINT IF EXISTS` 再重建 |

**Pattern 範例：**

```sql
-- ✅ 可以重複執行（先刪再建，不存在也不報錯）
DROP POLICY IF EXISTS "Public read" ON my_table;
CREATE POLICY "Public read" ON my_table FOR SELECT USING (true);

-- ❌ 不可重複執行（已存在就報錯）
CREATE POLICY "Public read" ON my_table FOR SELECT USING (true);
```

> 如果你遇到其他 `already exists` 錯誤，只需在 `CREATE` 前加上對應的 `DROP ... IF EXISTS` 即可。

---

## 步驟二：建立資料表 (SQL Schema)

前往 Supabase 的 **SQL Editor**，選擇 **New Query**，並執行以下 SQL 來建立所有必要的資料表與 RLS 原則：

```sql
-- 1. 專案 / AI 作品介紹 (Projects)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,               -- 作品分類
  overview TEXT,               -- 舊欄位，保留向下相容
  thumbnail_url TEXT,
  tech_tags TEXT[] DEFAULT '{}', -- 舊欄位，保留向下相容
  tags TEXT[] DEFAULT '{}',    -- 統一標籤（取代 tech_tags）
  demo_url TEXT,               -- 一般展示頁連結（embed_type='standard' 時使用）
  source_url TEXT,
  features TEXT[] DEFAULT '{}', -- 舊欄位，保留向下相容
  tech_details TEXT,           -- 舊欄位，保留向下相容
  content TEXT,                -- 合併說明欄（Markdown）
  image_urls TEXT[] DEFAULT '{}', -- 多圖支援
  embed_type TEXT DEFAULT 'standard', -- 展示方式：'standard' | 'html' | 'link'
  html_code TEXT,              -- 內嵌 HTML 程式碼（embed_type='html' 時使用）
  link_url TEXT,               -- 外部連結網址（embed_type='link' 時使用）
  published_at DATE DEFAULT CURRENT_DATE, -- 發布日期（未填預設今日）
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 提示詞 (Prompts)
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'creation',
  difficulty TEXT DEFAULT 'beginner',
  tags TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  input_example TEXT,
  output_example TEXT,
  author TEXT DEFAULT 'admin',
  status TEXT DEFAULT 'pending_review',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Skill
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT DEFAULT 'beginner',
  tags TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  usage_scenarios TEXT,        -- 舊欄位，保留向下相容（前台已不顯示）
  source TEXT,
  how_to_use TEXT,             -- 前台顯示為「使用說明」
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 工作坊 (Workshops)
CREATE TABLE IF NOT EXISTS workshops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE,
  description TEXT,
  registration_url TEXT,
  content TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 作品分享 (Shared Projects)
CREATE TABLE IF NOT EXISTS shared_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  content TEXT,
  html_code TEXT,              -- ★ 新：直接內嵌 HTML 應用程式
  embed_type TEXT DEFAULT 'link', -- ★ 新：'link'（外部連結）或 'html'（內嵌 HTML）
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 關於我 (About Me) - 僅單筆資料
CREATE TABLE IF NOT EXISTS about_me (
  id INTEGER PRIMARY KEY,
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO about_me (id, content) VALUES (1, '# 關於我\n請在此輸入內容...') ON CONFLICT DO NOTHING;

-- 7. 隱私政策 (Privacy Policy) - 僅單筆資料
CREATE TABLE IF NOT EXISTS privacy_policy (
  id INTEGER PRIMARY KEY,
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO privacy_policy (id, content) VALUES (1, '# 隱私政策\n請在此輸入內容...') ON CONFLICT DO NOTHING;

-- 8. 網站設定 (Site Settings) - 僅單筆資料
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY,
  maintenance_mode BOOLEAN DEFAULT false,
  meta_keywords TEXT,
  meta_description TEXT,
  not_found_message TEXT DEFAULT '頁面不存在，請確認網址是否正確。',
  ga_code TEXT,
  fb_pixel TEXT,
  adsense_header TEXT,
  adsense_ads TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 9. 回饋訊息 (Feedback)
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'resolved' | 'unresolvable'
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. ★ 新：分類管理 (Categories)
-- 用於後台「分類管理」頁面，支援 Skill、提示詞、作品介紹的自訂分類
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 可填入：'skill' | 'prompt' | 'project'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 步驟三：設定安全原則 (RLS)

這是為了確保您的資料庫不被駭客惡意修改的重要設定。
**請將下方 SQL 程式碼中的 `你的管理員Email` (共 8 處) 替換換成您用來登入後台的真實 Email！**
替換完成後，跟剛剛一樣，複製整段程式碼，到 Supabase 的 **SQL Editor** 執行一次即可。

```sql
-- 1. 啟用每張資料表的安全性檢查
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE about_me ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY; -- ★ 新

-- 2. 先刪除舊原則（避免重複執行時報錯）
DROP POLICY IF EXISTS "Public read projects" ON projects;
DROP POLICY IF EXISTS "Public read prompts" ON prompts;
DROP POLICY IF EXISTS "Public read workshops" ON workshops;
DROP POLICY IF EXISTS "Public read shared" ON shared_projects;
DROP POLICY IF EXISTS "Public read skills" ON skills;
DROP POLICY IF EXISTS "Public read about" ON about_me;
DROP POLICY IF EXISTS "Public read privacy" ON privacy_policy;
DROP POLICY IF EXISTS "Public read settings" ON site_settings;
DROP POLICY IF EXISTS "Public insert feedback" ON feedback;
DROP POLICY IF EXISTS "Admin full projects" ON projects;
DROP POLICY IF EXISTS "Admin full prompts" ON prompts;
DROP POLICY IF EXISTS "Admin full workshops" ON workshops;
DROP POLICY IF EXISTS "Admin full shared" ON shared_projects;
DROP POLICY IF EXISTS "Admin full skills" ON skills;
DROP POLICY IF EXISTS "Admin full about" ON about_me;
DROP POLICY IF EXISTS "Admin full privacy" ON privacy_policy;
DROP POLICY IF EXISTS "Admin full settings" ON site_settings;
DROP POLICY IF EXISTS "Admin full feedback" ON feedback;
DROP POLICY IF EXISTS "Public read categories" ON categories;
DROP POLICY IF EXISTS "Admin full categories" ON categories;

-- 3. 設定一般訪客（未登入者）的讀取權限
-- 允許所有人讀取已發布的文章與資料
CREATE POLICY "Public read projects" ON projects FOR SELECT USING (status = 'published');
CREATE POLICY "Public read prompts" ON prompts FOR SELECT USING (status = 'published');
CREATE POLICY "Public read workshops" ON workshops FOR SELECT USING (status = 'published');
CREATE POLICY "Public read shared" ON shared_projects FOR SELECT USING (status = 'published');
CREATE POLICY "Public read skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Public read about" ON about_me FOR SELECT USING (true);
CREATE POLICY "Public read privacy" ON privacy_policy FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON site_settings FOR SELECT USING (true);

-- 允許任何人從網站前台提交意見回饋（僅限 Insert 新增功能）
CREATE POLICY "Public insert feedback" ON feedback FOR INSERT WITH CHECK (true);

-- 4. 設定您的最高管理員權限 (請把 你的管理員Email 換成真實信箱)
CREATE POLICY "Admin full projects" ON projects FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin full prompts" ON prompts FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin full workshops" ON workshops FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin full shared" ON shared_projects FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin full skills" ON skills FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin full about" ON about_me FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin full privacy" ON privacy_policy FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin full settings" ON site_settings FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin full feedback" ON feedback FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');

-- ★ 新：分類管理（所有登入者可讀，管理員可完整操作）
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin full categories" ON categories FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
```

> [!TIP]
> 第一階段如果還不想限制那麼嚴格，或者是您的環境是在本機開發，也可以將 `'你的管理員Email'` 換成只要有成功登入就可以編輯，語法為 `auth.role() = 'authenticated'`。

---

## 步驟四：身分驗證，建立您的後台登入帳號 (Authentication)

既然您已經設定了哪一組 Email 是管理員，那現在就需要去註冊該帳號，並設定該帳號的密碼了！

1. 確保您的 **Email/Password** 登入是開啟的：
    * 前往左側選單的 **Authentication → Providers**。
    * 確認 **Email/Password** 狀態是 Enabled (綠色開啟狀態)。
2. 建立您的管理員帳號：
    * 前往左側選單的 **Authentication → Users**。
    * 點擊右上角的 **"Add user"** 按鈕，選擇 **"Create new user"**。
    * 在 Email 欄位輸入您剛剛設定的管理員信箱（例如：`您的管理員Email`）。
    * 在 Password 欄位設定您的**後台登入密碼**。
    * 不要勾選 Auto Confirm 以外的選項，直接點擊 **"Create user"** 即可。

> 現在，當您進入網站的 `/admin/login` 頁面，就可以用這組剛設定的 Email 加上密碼來登入您的專屬管理後台了！

若您後續想讓自己可以用 Google 快速登入（這需要額外去 Google Cloud 申請），請再參考 [Google_OAuth_設定教學.md](./Google_OAuth_設定教學.md)。

---

## 步驟五：檔案儲存 (Storage)

如果您需要上傳圖片，請在左側選單進入 **Storage**：
1. 點擊 **"New bucket"**。
2. Name 輸入 `assets`，並將 **"Public bucket"** 打勾。
3. 點擊 Create 建立。

**設定圖片的存取權限 (Storage RLS)：**
跟剛剛一樣，把這段 SQL 貼到 **SQL Editor** 中執行。（別忘了把 `你的管理員Email` 換成您自己的喔！）

```sql
-- 允許所有人讀取 assets 資料夾裡的圖片
CREATE POLICY "Public Read Images" ON storage.objects FOR SELECT USING (bucket_id = 'assets');

-- 允許管理員上傳、修改與刪除圖片
CREATE POLICY "Admin Insert Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assets' AND auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin Update Images" ON storage.objects FOR UPDATE USING (bucket_id = 'assets' AND auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Admin Delete Images" ON storage.objects FOR DELETE USING (bucket_id = 'assets' AND auth.jwt()->>'email' = '您的管理員Email');
```

---

> 🎉 完成以上設定後，重新啟動專案 (`npm run dev`) 即可開始使用管理後台。

---

## 附錄：現有資料庫升級 SQL（若你之前已部署過舊版，只需執行這段）

> ⚠️ **若你是全新部署，直接跳過此段。** 此段只適用於已建立過資料表、需要補上新欄位的情況。

前往 Supabase → **SQL Editor** → **New Query**，將以下**整段 SQL 全部貼入**後，點擊 **Run（▶）** 執行（可以全部一起跑，安全冪等）：

```sql
-- ══════════════════════════════════════════
-- 升級項目一：projects 資料表新增欄位
-- （作品介紹後台：合併說明欄、統一標籤、多圖支援）
-- ══════════════════════════════════════════

-- 作品分類
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category TEXT;

-- 合併說明欄：取代原本的 overview / features / tech_details
ALTER TABLE projects ADD COLUMN IF NOT EXISTS content TEXT;

-- 統一標籤：取代原本的 tech_tags（舊欄位保留，不刪除）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 多圖支援：可儲存多張圖片網址
ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';


-- ══════════════════════════════════════════
-- 升級項目二：projects 資料表新增作品類型與發布日期欄位
-- （作品介紹後台：支援內嵌 HTML、外部連結、自訂發布日期）
-- ══════════════════════════════════════════

-- 展示方式：'standard'（一般展示頁）| 'html'（內嵌應用）| 'link'（外部連結）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embed_type TEXT DEFAULT 'standard';

-- 內嵌 HTML 程式碼（embed_type='html' 時使用，前台 Demo 按鈕開啟我們部署的互動頁面）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS html_code TEXT;

-- 外部連結網址（embed_type='link' 時使用，前台 Demo 按鈕開啟此網址）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 發布日期（可自訂，未填預設使用今日）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_at DATE DEFAULT CURRENT_DATE;


-- ══════════════════════════════════════════
-- 升級項目三：shared_projects 資料表新增欄位
-- （作品分享舊資料表相容性欄位，仍可保留前台顯示）
-- ══════════════════════════════════════════

ALTER TABLE shared_projects ADD COLUMN IF NOT EXISTS html_code TEXT;
ALTER TABLE shared_projects ADD COLUMN IF NOT EXISTS embed_type TEXT DEFAULT 'link';


-- ══════════════════════════════════════════
-- 升級項目四：建立 categories 分類管理資料表
-- （後台「分類管理」頁，支援 Skill、提示詞、作品介紹的自訂分類）
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'skill' | 'prompt' | 'project'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON categories;
DROP POLICY IF EXISTS "Admin full categories" ON categories;

CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (true);

-- ⚠️ 把下方 Email 換成您的管理員信箱
CREATE POLICY "Admin full categories" ON categories
  FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');


-- ══════════════════════════════════════════
-- 升級項目五：建立 feedback 回報問題資料表
-- （前台「回報問題 / 提出建議」功能需要此表）
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,   -- 'feature' | 'bug' | 'usage'
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 後續新增欄位（狀態與管理員註記）
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Admin read feedback" ON feedback;

CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- ⚠️ 把下方 Email 換成您的管理員信箱
CREATE POLICY "Admin read feedback" ON feedback
  FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');


-- ══════════════════════════════════════════
-- 升級項目六：移除 prompts 分類 CHECK 限制
-- （若新增提示詞出現 "violates check constraint prompts_category_check" 錯誤，必須執行此段）
-- （移除後可使用任意中文或自訂分類名稱）
-- ══════════════════════════════════════════

ALTER TABLE prompts DROP CONSTRAINT IF EXISTS prompts_category_check;


-- ══════════════════════════════════════════
-- 升級項目六補充：修正 prompts 狀態 CHECK 限制
-- （若前台提交提示詞出現 "violates check constraint prompts_status_check" 錯誤，必須執行此段）
-- （加入 pending 狀態，支援前台提交待審核流程）
-- ══════════════════════════════════════════

ALTER TABLE prompts DROP CONSTRAINT IF EXISTS prompts_status_check;
ALTER TABLE prompts ADD CONSTRAINT prompts_status_check
  CHECK (status IN ('pending_review', 'published', 'draft', 'rejected'));

-- 若有之前誤存為 'pending' 的記錄，修正為 'pending_review'
UPDATE prompts SET status = 'pending_review' WHERE status = 'pending';


-- ══════════════════════════════════════════
-- 升級項目七：workshops 資料表新增完整欄位
-- （工作坊後台升級為與作品介紹管理相同的完整功能）
-- ══════════════════════════════════════════

ALTER TABLE workshops ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS embed_type TEXT DEFAULT 'link';
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS html_code TEXT;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS published_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS content TEXT;

-- 修正 workshops RLS 政策（加入 WITH CHECK，否則管理員無法新增）
DROP POLICY IF EXISTS "Admin full workshops" ON workshops;
CREATE POLICY "Admin full workshops" ON workshops
  FOR ALL
  USING (auth.jwt()->>'email' = '您的管理員Email')
  WITH CHECK (auth.jwt()->>'email' = '您的管理員Email');


-- ══════════════════════════════════════════
-- 升級項目八：會員系統 profiles + points_log 資料表
-- （Google 登入後自動建立會員資料，預設給 200 積分）
-- ══════════════════════════════════════════

-- 會員個人資料表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT,
  phone TEXT,
  gender TEXT,
  birthday DATE,
  notes TEXT,
  points INTEGER DEFAULT 200,
  level TEXT DEFAULT 'normal',  -- 'normal'（一般會員）| 'sponsor'（贊助會員）| 'subscriber'（訂閱會員）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 積分紀錄表
CREATE TABLE IF NOT EXISTS points_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 設定
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin full profiles" ON profiles;
DROP POLICY IF EXISTS "Users read own points" ON points_log;
DROP POLICY IF EXISTS "Admin full points_log" ON points_log;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin full profiles" ON profiles FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');
CREATE POLICY "Users read own points" ON points_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin full points_log" ON points_log FOR ALL USING (auth.jwt()->>'email' = '您的管理員Email');

-- 新會員自動建立 profile + 給 200 積分的觸發器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, points)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    200
  );
  INSERT INTO public.points_log (user_id, action, points)
  VALUES (NEW.id, '新會員註冊', 200);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ══════════════════════════════════════════
-- 升級項目九：會員等級改為三種類型
-- （移除銅/銀/金/鑽石，改為一般/贊助/訂閱會員，積分不影響等級）
-- ══════════════════════════════════════════

-- 將所有現有會員的等級更新為 normal（一般會員）
UPDATE profiles SET level = 'normal';

-- 修改預設值
ALTER TABLE profiles ALTER COLUMN level SET DEFAULT 'normal';

-- 更新 CHECK 限制（若有的話）
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_level_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_level_check
  CHECK (level IN ('normal', 'sponsor', 'subscriber'));

-- 更新觸發器，讓新會員預設為 normal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, points, level)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    200,
    'normal'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.points_log (user_id, action, points)
  VALUES (NEW.id, '新會員註冊', 200);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 補上 profiles INSERT policy（若缺少會導致前台無法建立 profile）
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
```

---
