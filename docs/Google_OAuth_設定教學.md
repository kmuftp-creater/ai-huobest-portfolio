# Google OAuth 設定教學

本指南教你如何為「霍 の AI 腦洞實驗室」設定 Google OAuth 登入功能。

---

## 步驟一：建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 如尚未登入，請使用你的 Google 帳號登入
3. 點擊頂部導覽列的專案選擇器 → **「新增專案」**
4. 輸入專案名稱，例如 `AI-BrainHole-Lab`
5. 點擊 **「建立」**

---

## 步驟二：啟用 OAuth API

1. 在 Google Cloud Console 左側選單，前往 **「API 和服務」** → **「已啟用的 API 和服務」**
2. 點擊 **「+ 啟用 API 和服務」**
3. 搜尋 **「Google+ API」** 或 **「Google Identity」**（不需要特別啟用，只要設定 OAuth 同意畫面即可）

---

## 步驟三：設定 OAuth 同意畫面

1. 前往 **「API 和服務」** → **「OAuth 同意畫面」**
2. 選擇 **「外部」** (External)，然後點擊 **「建立」**
3. 填入以下資訊：
   - **應用程式名稱**: `霍 の AI 腦洞實驗室`
   - **使用者支援電子郵件**: 你的 Email
   - **開發人員聯繫資訊**: 你的 Email
4. 點擊 **「儲存並繼續」**
5. 範圍頁面：點擊 **「新增或移除範圍」**，勾選：
   - `email`
   - `profile`
   - `openid`
6. 點擊 **「儲存並繼續」** 直到完成

---

## 步驟四：建立 OAuth 2.0 用戶端 ID

1. 前往 **「API 和服務」** → **「憑證」**
2. 點擊 **「+ 建立憑證」** → **「OAuth 用戶端 ID」**
3. 應用程式類型選擇 **「網頁應用程式」**
4. 名稱：`AI BrainHole Lab Web Client`
5. **已授權的 JavaScript 來源**：
   - `http://localhost:3000`（開發環境）
   - `https://你的網域.com`（正式環境）
6. **已授權的重新導向 URI**：
   - `https://你的SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
   > ⚠️ 請將 `你的SUPABASE_PROJECT_ID` 替換為實際的 Supabase 專案 ID
7. 點擊 **「建立」**
8. 記下顯示的 **Client ID** 和 **Client Secret**

---

## 步驟五：在 Supabase 設定 Google Provider

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 前往 **Authentication** → **Providers**
4. 找到 **Google**，點擊展開
5. 切換為 **啟用**
6. 填入：
   - **Client ID**: 步驟四取得的 Client ID
   - **Client Secret**: 步驟四取得的 Client Secret
7. 點擊 **「Save」**

---

## 步驟六：在專案中設定環境變數

在專案根目錄建立 `.env.local` 檔案：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的專案ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_key
```

> 這些值可以在 Supabase Dashboard → Settings → API 中找到。

---

## 測試

1. 執行 `npm run dev` 啟動開發伺服器
2. 前往提示詞分享頁面
3. 點擊「使用 Google 帳號登入」按鈕
4. 應該會跳轉到 Google 登入頁面
5. 登入成功後會重新導向回網站

---

## 常見問題

| 問題 | 解決方法 |
|------|---------|
| redirect_uri_mismatch | 確認「已授權的重新導向 URI」與 Supabase callback URL 完全一致 |
| 登入後沒有跳轉 | 確認 `.env.local` 中的環境變數正確 |
| 在 localhost 無法登入 | 確認 JavaScript 來源有加入 `http://localhost:3000` |

---

> 📌 如有任何問題，請使用網站上的「回報問題」功能聯繫我們。
