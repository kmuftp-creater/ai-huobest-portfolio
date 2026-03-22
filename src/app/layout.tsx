import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "霍 の AI 腦洞實驗室",
  description: "探索 AI 的無限可能，分享創意與技術的交匯點。AI 專案作品、提示詞分享、Skill 分享、工作坊。",
  keywords: "AI, 人工智慧, 提示詞, Prompt, 專案, Portfolio, 工作坊, Skill",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
