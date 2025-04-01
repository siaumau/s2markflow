import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Markdown & Mermaid 編輯器",
  description: "支援 Markdown 和 Mermaid 圖表的編輯器",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
