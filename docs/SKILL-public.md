---
name: nextjs-supabase-website-public
description: >
  設計並開發基於 Next.js 16 (App Router) + Supabase + TypeScript + Vercel 的完整網站。
  涵蓋從零到部署的第一階段完整流程：資料庫設計、RLS 安全策略、Google OAuth 登入、
  前後台架構、主題系統、Markdown 渲染、多語系、圖片上傳、自動備份。
---

# Next.js + Supabase 網站設計指南（第一階段）

適用於使用 Next.js 16 App Router + Supabase + TypeScript + Vercel 建立具備前後台、會員登入、內容管理的完整網站。

---

## 技術棧

| 層次 | 技術 |
|------|------|
| 框架 | Next.js 16（App Router） |
| 語言 | TypeScript |
| 資料庫 + Auth | Supabase（PostgreSQL + RLS + OAuth） |
| 部署 | Vercel |
| UI | 純 CSS Modules，手刻 |
| 圖示 | lucide-react |
| Markdown | react-markdown + remark-gfm + remark-breaks + rehype-raw + rehype-sanitize |

---

## 目錄結構

- `src/app/` — 按功能模組切分頁面
- `src/app/admin/` — 後台所有頁面，middleware 統一保護
- `src/app/auth/callback/` — Google OAuth callback（Route Handler）
- `src/app/api/` — API Routes（備份 cron 等）
- `src/components/layout/` — AppShell、Navbar、Footer
- `src/contexts/` — AuthContext、ThemeContext、I18nContext
- `src/lib/` — Supabase client（Browser singleton + Server）、Markdown 安全白名單

---

## 環境變數規範

- `NEXT_PUBLIC_` 前綴 → 前端可見，只放 Supabase URL 和 anon key
- `SUPABASE_SERVICE_ROLE_KEY` → 不加 `NEXT_PUBLIC_`，僅在 Server API Route 使用
- `NEXT_PUBLIC_ADMIN_EMAIL` → 後台身份驗證比對
- `CRON_SECRET` → 備份 API 安全密鑰

---

## Supabase 設定原則

- Browser client 做成 singleton，整個 app 共用同一實例
- Server client 每次 request 各自建立，需綁定當次 cookies
- 每張資料表都必須啟用 RLS
- 公開讀取只開放 `status = 'published'` 的資料
- INSERT policy 必須同時有 `WITH CHECK`，只有 `USING` 會導致寫入報錯
- SECURITY DEFINER 函數必須加 `SET search_path = public`，否則計數器等功能會失效

---

## 認證系統（Auth）

- 整個 app 只能有一個 `getSession()` 呼叫，集中在 `AuthContext`；多個元件各自呼叫會競爭 Web Lock
- Google OAuth callback 必須是 Server Route Handler，使用 `exchangeCodeForSession` 完成 session 交換
- 後台每頁套 AdminShell 做第二層驗證，並加 5 秒超時保護避免永久卡住

---

## Middleware

- 處理：後台路由保護、IP 封鎖、會員封鎖
- matcher 必須排除靜態資源（`_next/static`、圖片等），避免每次資源請求都觸發 Supabase 查詢
- 後台 layout 加 `robots: 'noindex, nofollow'`

---

## 主題系統

- 以 CSS 自訂變數定義完整設計系統（色彩、間距、圓角、陰影、字型）
- 主題切換只改 `<html>` 的 `data-theme` attribute，靠 CSS 選擇器覆蓋變數值
- 配色方案用 `data-color-scheme` attribute 疊加，與 dark/light 正交
- 初始值從 `localStorage` 讀取並持久化

---

## Markdown 渲染

- 套件組合：`remark-gfm`（表格、GFM 語法）+ `remark-breaks`（單行換行）+ `rehype-raw`（內嵌 HTML）+ `rehype-sanitize`（安全過濾）
- 自訂安全白名單：允許 div/table/img 等常用標籤，移除 script/iframe/form 及所有 `on*` 事件屬性
- 全站所有 ReactMarkdown 使用同一份 permissiveSchema
- `globals.css` 若有 list-style reset，各 Markdown 容器要分別還原 ul/ol 的 `list-style-type`
- table 需在各容器 CSS 自行加樣式，瀏覽器無預設 table 樣式

---

## 多語系（i18n）

- 翻譯 JSON 放 `src/i18n/`，以 `zh-TW` 為主語言，其他語系對齊同一份 key 結構
- `t('key.path')` 工具函數，key 不存在時直接回傳 key 字串（前台會顯示原始 key，不會報錯）
- 每新增頁面，所有語系 JSON 都要補對應 key

---

## 圖片處理

- 上傳到 Supabase Storage，取得 publicUrl 後存入資料庫
- 前台用 `react-medium-image-zoom` 實現點擊放大；需 import 套件附帶的 CSS
- iframe embed 的 sandbox 屬性需加 `allow-downloads`

---

## 自動備份

- 備份 API Route 用 `SUPABASE_SERVICE_ROLE_KEY` 讀取所有資料表，透過 nodemailer 寄送 Gmail
- `vercel.json` 設定 Cron Job（免費版有次數限制）；替代方案用 cron-job.org（完全免費）
- API Route 要驗證 `Authorization: Bearer CRON_SECRET`，防止未授權呼叫

---

## 資料表設計通則

- 主鍵：`UUID DEFAULT gen_random_uuid()`
- 每張表加 `created_at` + `updated_at`（`TIMESTAMPTZ DEFAULT now()`）
- 狀態流程：`draft → published / rejected`
- tags 用 PostgreSQL 原生陣列 `TEXT[] DEFAULT '{}'`
- Migration SQL 用 `IF NOT EXISTS` / `DROP IF EXISTS`，確保冪等可重複執行

---

## 前後台架構

**前台：** `'use client'` + `useEffect` 拉資料，讀取 RLS 允許的公開內容，登入後才能操作互動功能。

**後台：** AdminShell 包住每頁做第二層驗證，middleware 是第一層，需跨越 RLS 的操作走 API Route 並使用 service role key。

---

## 推薦開發順序

1. 建立 Next.js 專案，安裝套件
2. 建立 Supabase 專案，設定環境變數
3. 設計資料庫 schema，寫 RLS policies
4. 建立 Browser / Server Supabase client
5. 建立 AuthContext、ThemeContext、I18nContext
6. 建立 AppShell + Navbar + Footer
7. 設計 globals.css 設計系統（CSS 變數）
8. 建立 middleware
9. 建立 auth/callback Route Handler
10. 建立後台 AdminShell + login 頁
11. 依功能逐一開發前後台頁面
12. 設定 Vercel 環境變數，部署
13. 設定 Google OAuth 正式網域
14. 全站測試，確認 RLS 無漏洞
