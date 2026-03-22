# Vercel 免費部署教學（新手圖文版）

本指南將教你如何免費、快速地將「霍 の AI 腦洞實驗室」專案部署（上線）到網際網路。
我們將使用 **Vercel** 這個平台，它對 Next.js（我們使用的框架）和新手非常友善，而且完全免費。

---

## 第一階段：準備你的程式碼 (GitHub)

Vercel 部署的最佳方式是將你的程式碼上傳到 **GitHub**。如果還沒有帳號，請進行以下步驟：

### 1. 註冊與登入 GitHub
1. 前往 [GitHub 官網](https://github.com/)。
2. 點擊右上角的 **「Sign up」** 註冊一個免費帳號。
3. 註冊完成並登入。

### 2. 建立新的資源庫 (Repository)
1. 登入 GitHub 後，點擊右上角的 **「+」** 號，選擇 **「New repository」**。
2. **Repository name (資源庫名稱)**：輸入你的專案名稱（例如：`huobest-portfolio` 或 `ai-lab`）。這個名稱不可有空格（請用橫線 `-` 隔開）。
3. **設定成私有**：在 `Public` / `Private` 選項中，強烈建議選擇 **「Private」**（私有），這樣別人才不會看到你的程式碼。
4. 點擊最下方的綠色按鈕 **「Create repository」**。
5. 建立完成後，**停留在該畫面**，稍後我們需要用到上面的網址（URL）。

### 3. 將本機程式碼上傳到 GitHub
你現在位於 `my-agy-projects` 資料夾。由於您可能是新手，我們直接在下方的終端機（Terminal）視窗中依序輸入以下指令：

> ⚠️ **注意：請不要複製到 ```bash 或是 # 開頭的中文備註，那些只是說明文字。只需要複製並執行指令的部分。**

```bash
# 0. 初始化 Git 資源庫（這是一次性動作）
git init
git checkout -b main

# 1. 將所有變更加入追蹤
git add .
 
# 2. 寫下這次上傳的備註（你可以自己改備註文字）
git commit -m "部署前最後版本"
 
# 3. 設定 GitHub 的目標網址（請將下方的連結換成 GitHub 上看到的）
# 範例：git remote add origin https://github.com/你的帳號/你的資源庫名稱.git
git remote add origin https://github.com/你的帳號/你的資源庫名稱.git
 
# 4. 將程式碼推上 GitHub
git push -u origin main
```

如果你覺得終端機指令太困難，也可以去下載 [GitHub Desktop](https://desktop.github.com/) 這個免費的圖形化軟體，它可以讓你用「點擊按鈕」的方式完成上傳。

---

## 第二階段：註冊 Vercel 並連結 GitHub

### 1. 登入 Vercel
1. 前往 [Vercel 官網](https://vercel.com/)。
2. 點擊右上角黑色的 **「Sign Up」** 或 **「Log In」** 按鈕。
3. 選擇 **「Continue with GitHub」**（用 GitHub 帳號登入）。
4. 跟隨畫面授權 Vercel 存取你的 GitHub 帳號。

### 2. 匯入專案 (Import Project)
1. 登入 Vercel 後台後，點擊畫面中間或右上角的 **「Add New」** -> **「Project」**。
2. 畫面左側會出現 `Import Git Repository`（匯入 Git 資源庫）。
3. 點擊你的 GitHub 帳號，這時可能會跳出視窗要求你「授權」Vercel 讀取特定的資料夾（Repository），請將剛剛建立的那個 Private repository 打勾授權。
4. 在畫面上找到你剛剛上傳的專案（例如：`huobest-portfolio`），點擊旁邊的 **「Import」** 按鈕。

---

## 第三階段：部署設定（最重要的一步！）

在點擊 Import 之後，會進入「Configure Project」頁面，這裡有兩個地方需要注意。

### 1. 確認 Framework Preset
*   Vercel 很聰明，它通常會自動偵測到你的專案是 **「Next.js」**。確認這個選項是 Next.js 就好。

### 2. 設定環境變數 (Environment Variables)
這是**最關鍵**的一步！你的專案需要連線到 Supabase 資料庫，但因為我們不會把密碼放到 GitHub 上，所以必須把金鑰填寫在這裡。

1. 點擊展開 **「Environment Variables」** 區塊。
2. 你需要打開你電腦中的 `.env.local` 檔案。
3. 依序新增這三把鑰匙（將 `.env.local` 裡的東西複製貼上）：
    *   **第一組**：
        *   Name (名稱)：`NEXT_PUBLIC_SUPABASE_URL`
        *   Value (值)：填入你在 Supabase 的 URL 網址。
        *   點「Add」。
    *   **第二組**：
        *   Name (名稱)：`NEXT_PUBLIC_SUPABASE_ANON_KEY`
        *   Value (值)：填入你的 anon/public 金鑰。
        *   點「Add」。
    *   **第三組**（管理後台必備）：
        *   Name (名稱)：`SUPABASE_SERVICE_ROLE_KEY`
        *   Value (值)：填入你的 service_role 金鑰。
        *   點「Add」。

### 3. 點擊部署 (Deploy)
1. 三組環境變數都新增完畢後。
2. 點擊最下方的 **「Deploy」** 按鈕。
3. Vercel 會開始自動建置你的網站，這通常需要 1~3 分鐘。這段期間畫面會跑程式碼，你可以去喝口水。

---

## 第四階段：完成與後續設定

### 1. 恭喜上線
當畫面出現灑花的動畫（Congratulations），代表你的網站已經成功上線了！
1. 點擊縮圖上的 **「Continue to Dashboard」**。
2. 在右上角你會看到一個有 `.vercel.app` 結尾的網址，點擊它（Visit 按鈕），這就是你對外的正式網站！

### 2. 後續：為 Supabase 設定網域（重要）
網站上線後，你需要告訴 Supabase 跟 Google 「這是一個合法的網址」，否則登入功能會失效。

1. 複製你剛拿到的 Vercel 網址（例如：`https://huobest-portfolio.vercel.app`）。
2. **Supabase 設定**：
   * 進入 Supabase -> `Authentication` -> `URL Configuration`。
   * 在 `Site URL` 欄位，貼上這個新網址並儲存。
   * 如果有 `Redirect URLs`，也請新增這個新網址。
   * 修改 Google 登入提供者：進入 `Authentication` -> `Providers` -> 展開 `Google`。把裡面提供的 Callback URL（例如：`https://[PROJECT_ID].supabase.co/auth/v1/callback`）記好。
3. **Google Cloud Platform (GCP) 設定**（如果在 Supabase 教學中設定過）：
   * 進到你的 Google API 控制台 -> 憑證 -> 你建立的 OAuth 用戶端。
   * 在「已授權的 JavaScript 來源」新增這串 Vercel 網址。
   * 確保「已授權的重新導向 URI（Callback URL）」是正確指向 Supabase 提供的回調網址。

### 3. (進階) 綁定您自訂的專屬網域 (Custom Domain)
如果您有在 GoDaddy、Namecheap 或 Cloudflare 等平台購買自己的專屬網域（例如：`huobest.com`），您可以免費綁定到 Vercel：

1. 到 Vercel 專案的儀表板，點擊上方的 **「Settings」**(設定) 頁籤。
2. 點擊左側選單的 **「Domains」**(網域)。
3. 在輸入框中填入您購買的網域（例如：`ai.huobest.com` 或 `huobest.com`），點擊 **「Add」**。
4. Vercel 會提供您一組需要設定的 **DNS 紀錄**。這通常會是：
   * 給根網域（例如 `huobest.com`）：一個 **A Record**，指向 `76.76.21.21`。
   * 給子網域（例如 `ai.huobest.com`）：一個 **CNAME Record**，指向 `cname.vercel-dns.com`。
5. 登入您購買網域的平台（如 GoDaddy），前往「DNS 設定/管理」頁面。
6. 新增 Vercel 提供給您的 DNS 紀錄，然後儲存。
7. 回到 Vercel，等待幾分鐘（DNS 生效可能需要一點時間），當 Vercel 確認成功抓到設定後，就會自動幫您免費發行一個 SSL 安全憑證（讓您的網址前面有鎖頭 HTTPS），接著就可以用您的專屬網域連進網站了！

> 💡 **重要提醒：** 如果您綁定了新的自訂網域，**請務必回到上方的「2. 後續：為 Supabase 設定網域」**，把這個新的專屬網域也加入到 Supabase 和 Google GCP 的允許清單中！

只要你在本機寫好新的程式碼，推上（Push）GitHub，Vercel 就會**自動感應並幫你重新部署新版本**，完全不用手動點擊！如果在上述步驟有任何沒遇過的問題，隨時回來問我。
